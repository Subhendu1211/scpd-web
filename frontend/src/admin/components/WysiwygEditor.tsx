import React, { useEffect, useMemo, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import { NodeSelection } from "@tiptap/pm/state";

interface WysiwygEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  required?: boolean;
  onImageUpload?: (file: File) => Promise<string>;
  onLoadImageLibrary?: () => Promise<
    Array<{
      id: number;
      url: string;
      altText?: string | null;
      originalName?: string | null;
    }>
  >;
}

const PositionedImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      align: {
        default: "center",
        parseHTML: (element) => {
          const className = element.getAttribute("class") || "";
          if (className.includes("cms-inline-image--left")) return "left";
          if (className.includes("cms-inline-image--right")) return "right";
          return "center";
        },
        renderHTML: (attributes) => ({
          class: `cms-inline-image cms-inline-image--${attributes.align || "center"}`,
        }),
      },
      width: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-width"),
        renderHTML: (attributes) => {
          if (!attributes.width) return {};
          return {
            "data-width": attributes.width,
            style: `--cms-inline-image-width:${attributes.width};`,
          };
        },
      },
      caption: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-caption") || "",
        renderHTML: (attributes) => {
          const caption = String(attributes.caption || "").trim();
          if (!caption) {
            return {};
          }
          return {
            "data-caption": caption,
            title: caption,
          };
        },
      },
    };
  },

  addNodeView() {
    return ({ node, getPos, editor }) => {
      let currentNode = node;

      const wrapper = document.createElement("span");
      wrapper.className = "cms-inline-image-nodeview";
      wrapper.contentEditable = "false";
      wrapper.setAttribute("draggable", "true");

      const image = document.createElement("img");
      const dragHandle = document.createElement("span");
      dragHandle.className = "cms-inline-image-drag-handle";
      dragHandle.title = "Drag to reposition";
      dragHandle.setAttribute("data-drag-handle", "true");
      const handle = document.createElement("span");
      handle.className = "cms-inline-image-resize-handle";
      handle.title = "Drag to resize";

      const applyAttrs = (attrs: Record<string, unknown>) => {
        const align = String(attrs.align || "center");
        const width = String(attrs.width || "60%");
        wrapper.className = `cms-inline-image-nodeview cms-inline-image--${align}`;
        wrapper.style.setProperty("--cms-inline-image-width", width);
        image.className = `cms-inline-image cms-inline-image--${align}`;
        image.src = String(attrs.src || "");
        image.alt = String(attrs.alt || "");
        image.title = String(attrs.caption || "");
        image.setAttribute("draggable", "false");
      };

      const setSelectionToImage = () => {
        const pos = typeof getPos === "function" ? getPos() : null;
        if (typeof pos !== "number") {
          return;
        }
        const tr = editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, pos));
        editor.view.dispatch(tr);
      };

      const updateNodeAttrs = (nextAttrs: Record<string, unknown>) => {
        const pos = typeof getPos === "function" ? getPos() : null;
        if (typeof pos !== "number") {
          return;
        }
        const tr = editor.state.tr.setNodeMarkup(pos, undefined, {
          ...currentNode.attrs,
          ...nextAttrs,
        });
        editor.view.dispatch(tr);
      };

      const onResizeMouseDown = (event: MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        setSelectionToImage();

        const editorRect = editor.view.dom.getBoundingClientRect();
        const startX = event.clientX;
        const startWidth = wrapper.getBoundingClientRect().width;
        const minWidth = 80;
        const maxWidth = Math.max(minWidth, editorRect.width - 24);

        const onMove = (moveEvent: MouseEvent) => {
          const deltaX = moveEvent.clientX - startX;
          const nextWidth = Math.min(maxWidth, Math.max(minWidth, startWidth + deltaX));
          const widthPct = Math.max(10, Math.min(100, Math.round((nextWidth / editorRect.width) * 100)));
          wrapper.style.setProperty("--cms-inline-image-width", `${widthPct}%`);
        };

        const onUp = (upEvent: MouseEvent) => {
          const deltaX = upEvent.clientX - startX;
          const nextWidth = Math.min(maxWidth, Math.max(minWidth, startWidth + deltaX));
          const widthPct = Math.max(10, Math.min(100, Math.round((nextWidth / editorRect.width) * 100)));
          updateNodeAttrs({ width: `${widthPct}%` });
          document.removeEventListener("mousemove", onMove);
          document.removeEventListener("mouseup", onUp);
        };

        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
      };

      const onDragStart = (event: DragEvent) => {
        setSelectionToImage();
        if (event.dataTransfer) {
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData("text/plain", "cms-inline-image");
        }
      };

      wrapper.addEventListener("click", setSelectionToImage);
      wrapper.addEventListener("dragstart", onDragStart);
      dragHandle.addEventListener("mousedown", (event) => {
        event.stopPropagation();
      });
      handle.addEventListener("mousedown", onResizeMouseDown);

      wrapper.appendChild(dragHandle);
      wrapper.appendChild(image);
      wrapper.appendChild(handle);
      applyAttrs(currentNode.attrs as Record<string, unknown>);

      return {
        dom: wrapper,
        update(updatedNode) {
          if (updatedNode.type !== currentNode.type) {
            return false;
          }
          currentNode = updatedNode;
          applyAttrs(updatedNode.attrs as Record<string, unknown>);
          return true;
        },
        selectNode() {
          wrapper.classList.add("is-selected");
        },
        deselectNode() {
          wrapper.classList.remove("is-selected");
        },
        destroy() {
          wrapper.removeEventListener("click", setSelectionToImage);
          wrapper.removeEventListener("dragstart", onDragStart);
          handle.removeEventListener("mousedown", onResizeMouseDown);
        },
      };
    };
  },
});

const ToolbarButton = ({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    className={`wysiwyg-toolbar-btn${active ? " is-active" : ""}`}
  >
    {children}
  </button>
);

const WysiwygEditor: React.FC<WysiwygEditorProps> = ({
  value,
  onChange,
  placeholder = "Enter content...",
  required,
  onImageUpload,
  onLoadImageLibrary,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [imageBusy, setImageBusy] = useState(false);
  const [selectionVersion, setSelectionVersion] = useState(0);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [libraryItems, setLibraryItems] = useState<
    Array<{
      id: number;
      url: string;
      altText?: string | null;
      originalName?: string | null;
    }>
  >([]);
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder }),
      PositionedImage,
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  const isImageSelected = useMemo(() => {
    if (!editor) return false;
    const selection = editor.state.selection;
    return selection instanceof NodeSelection && selection.node?.type?.name === "image";
  }, [editor, selectionVersion]);

  const selectedImageAttrs = useMemo(() => {
    if (!editor || !isImageSelected) {
      return null;
    }
    return editor.getAttributes("image") as {
      align?: "left" | "center" | "right";
      width?: string;
      alt?: string;
      caption?: string;
    };
  }, [editor, isImageSelected, selectionVersion]);

  useEffect(() => {
    if (!editor) return;
    const onSelectionUpdate = () => setSelectionVersion((v) => v + 1);
    editor.on("selectionUpdate", onSelectionUpdate);
    editor.on("update", onSelectionUpdate);
    return () => {
      editor.off("selectionUpdate", onSelectionUpdate);
      editor.off("update", onSelectionUpdate);
    };
  }, [editor]);

  const pickInlineImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !editor) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      return;
    }

    try {
      setImageBusy(true);
      const src = onImageUpload ? await onImageUpload(file) : URL.createObjectURL(file);
      editor
        .chain()
        .focus()
        .setImage({
          src,
          alt: file.name,
          align: "center",
        } as never)
        .run();
    } finally {
      setImageBusy(false);
      if (event.target) {
        event.target.value = "";
      }
    }
  };

  const setSelectedImageAlign = (align: "left" | "center" | "right") => {
    if (!editor || !isImageSelected) return;
    editor.chain().focus().updateAttributes("image", { align }).run();
  };

  const setSelectedImageWidth = (width: string) => {
    if (!editor || !isImageSelected) return;
    editor.chain().focus().updateAttributes("image", { width }).run();
  };

  const updateSelectedImageMeta = (attrs: Record<string, string>) => {
    if (!editor || !isImageSelected) return;
    editor.chain().focus().updateAttributes("image", attrs).run();
  };

  const openLibrary = async () => {
    if (!onLoadImageLibrary) {
      return;
    }
    setLibraryOpen(true);
    setLibraryLoading(true);
    setLibraryError(null);
    try {
      const items = await onLoadImageLibrary();
      setLibraryItems(items);
    } catch {
      setLibraryError("Unable to load media library");
    } finally {
      setLibraryLoading(false);
    }
  };

  const insertFromLibrary = (item: {
    id: number;
    url: string;
    altText?: string | null;
    originalName?: string | null;
  }) => {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .setImage({
        src: item.url,
        alt: item.altText || item.originalName || "Image",
        align: "center",
      } as never)
      .run();
    setLibraryOpen(false);
  };

  // Sync external value changes (e.g. when loading a different page)
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (current !== value) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div className={`wysiwyg-editor${required ? " wysiwyg-required" : ""}`}>
      <div className="wysiwyg-toolbar">
        <div className="wysiwyg-toolbar-group">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive("bold")}
            title="Bold"
          >
            <b>B</b>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive("italic")}
            title="Italic"
          >
            <i>I</i>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            active={editor.isActive("strike")}
            title="Strikethrough"
          >
            <s>S</s>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCode().run()}
            active={editor.isActive("code")}
            title="Inline code"
          >
            {"<>"}
          </ToolbarButton>
        </div>
        <div className="wysiwyg-toolbar-group">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            active={editor.isActive("heading", { level: 1 })}
            title="Heading 1"
          >
            H1
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            active={editor.isActive("heading", { level: 2 })}
            title="Heading 2"
          >
            H2
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            active={editor.isActive("heading", { level: 3 })}
            title="Heading 3"
          >
            H3
          </ToolbarButton>
        </div>
        <div className="wysiwyg-toolbar-group">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive("bulletList")}
            title="Bullet list"
          >
            &#8226; List
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive("orderedList")}
            title="Ordered list"
          >
            1. List
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            active={editor.isActive("blockquote")}
            title="Blockquote"
          >
            ❝
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            active={editor.isActive("codeBlock")}
            title="Code block"
          >
            {"{ }"}
          </ToolbarButton>
        </div>
        <div className="wysiwyg-toolbar-group">
          <ToolbarButton
            onClick={() => fileInputRef.current?.click()}
            title="Insert image"
          >
            {imageBusy ? "..." : "Img"}
          </ToolbarButton>
          <ToolbarButton
            onClick={openLibrary}
            title="Insert from media library"
          >
            Lib
          </ToolbarButton>
          <ToolbarButton
            onClick={() => setSelectedImageAlign("left")}
            active={isImageSelected && editor.getAttributes("image")?.align === "left"}
            title="Align selected image left"
          >
            Img-L
          </ToolbarButton>
          <ToolbarButton
            onClick={() => setSelectedImageAlign("center")}
            active={isImageSelected && editor.getAttributes("image")?.align === "center"}
            title="Align selected image center"
          >
            Img-C
          </ToolbarButton>
          <ToolbarButton
            onClick={() => setSelectedImageAlign("right")}
            active={isImageSelected && editor.getAttributes("image")?.align === "right"}
            title="Align selected image right"
          >
            Img-R
          </ToolbarButton>
        </div>
        <div className="wysiwyg-toolbar-group">
          <ToolbarButton
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            title="Horizontal rule"
          >
            &#8213;
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            title="Undo"
          >
            ↩
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            title="Redo"
          >
            ↪
          </ToolbarButton>
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={pickInlineImage}
        style={{ display: "none" }}
      />
      {isImageSelected && selectedImageAttrs ? (
        <div className="wysiwyg-image-controls">
          <div className="wysiwyg-image-control-row">
            <span>Width</span>
            <div className="wysiwyg-image-size-buttons">
              {[
                { label: "33%", value: "33%" },
                { label: "50%", value: "50%" },
                { label: "75%", value: "75%" },
                { label: "100%", value: "100%" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`wysiwyg-toolbar-btn${selectedImageAttrs.width === opt.value ? " is-active" : ""}`}
                  onClick={() => setSelectedImageWidth(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="wysiwyg-image-control-row">
            <span>Alt</span>
            <input
              className="wysiwyg-inline-input"
              value={selectedImageAttrs.alt || ""}
              onChange={(e) => updateSelectedImageMeta({ alt: e.target.value })}
              placeholder="Image description"
            />
          </div>
          <div className="wysiwyg-image-control-row">
            <span>Caption</span>
            <input
              className="wysiwyg-inline-input"
              value={selectedImageAttrs.caption || ""}
              onChange={(e) => updateSelectedImageMeta({ caption: e.target.value })}
              placeholder="Optional caption"
            />
          </div>
        </div>
      ) : null}
      {libraryOpen ? (
        <div className="wysiwyg-library-overlay" role="dialog" aria-modal="true">
          <div className="wysiwyg-library-panel">
            <div className="wysiwyg-library-header">
              <strong>Media Library</strong>
              <button
                type="button"
                className="wysiwyg-toolbar-btn"
                onClick={() => setLibraryOpen(false)}
              >
                Close
              </button>
            </div>
            {libraryLoading ? <p>Loading images...</p> : null}
            {libraryError ? <p>{libraryError}</p> : null}
            {!libraryLoading && !libraryError ? (
              <div className="wysiwyg-library-grid">
                {libraryItems.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    className="wysiwyg-library-item"
                    onClick={() => insertFromLibrary(item)}
                    title={item.altText || item.originalName || "Insert image"}
                  >
                    <img src={item.url} alt={item.altText || item.originalName || ""} />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
      <EditorContent editor={editor} className="wysiwyg-content" />
    </div>
  );
};

export default WysiwygEditor;
