import React, { useEffect, useRef } from "react";

export default function Register() {
  const mainRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    document.title = "Register — SCPD";
    // focus main for screen readers
    const t = setTimeout(() => {
      mainRef.current?.focus();
    }, 50);
    return () => clearTimeout(t);
  }, []);

  return (
    <main
      id="main-content"
      ref={mainRef}
      tabIndex={-1}
      role="main"
      className="p-6 max-w-3xl mx-auto"
    >
      <h1 className="text-2xl font-bold mb-4">Register</h1>

      <p className="mb-4">Please fill in your details to register.</p>

      <form className="space-y-4" aria-label="Registration form">
        <label className="block">
          <span className="text-sm">Full name</span>
          <input name="name" className="mt-1 block w-full border rounded px-3 py-2" />
        </label>

        <label className="block">
          <span className="text-sm">Email</span>
          <input name="email" type="email" className="mt-1 block w-full border rounded px-3 py-2" />
        </label>

        <label className="block">
          <span className="text-sm">Mobile / Phone</span>
          <input name="phone" className="mt-1 block w-full border rounded px-3 py-2" />
        </label>

        <div className="flex gap-3">
          <button className="px-4 py-2 bg-blue-600 text-white rounded">Submit</button>
          <button type="reset" className="px-4 py-2 border rounded">Reset</button>
        </div>
      </form>
    </main>
  );
}
