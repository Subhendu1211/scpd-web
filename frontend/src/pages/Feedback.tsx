import React, { useCallback, useEffect, useState } from "react";

export default function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [captchaCode, setCaptchaCode] = useState("");
  const [captchaInput, setCaptchaInput] = useState("");
  const [captchaError, setCaptchaError] = useState("");
  const [submitMessage, setSubmitMessage] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const randomCaptcha = useCallback(() => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  }, []);

  useEffect(() => {
    setCaptchaCode(randomCaptcha());
  }, [randomCaptcha]);

  const refreshCaptcha = (keepError = false) => {
    setCaptchaCode(randomCaptcha());
    setCaptchaInput("");
    if (!keepError) setCaptchaError("");
  };

  const playCaptchaAudio = () => {
    if (!("speechSynthesis" in window) || !captchaCode) return;
    window.speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(captchaCode.split("").join(" "));
    speech.rate = 0.8;
    speech.pitch = 1;
    speech.lang = "en-IN";
    window.speechSynthesis.speak(speech);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitMessage("");
    setSubmitError("");
    const normalizedInput = captchaInput.trim().replace(/\s+/g, "").toUpperCase();

    if (!normalizedInput || normalizedInput !== captchaCode) {
      setCaptchaError("Captcha is incorrect. Please try again.");
      refreshCaptcha(true);
      return;
    }

    setCaptchaError("");

    setSubmitting(true);
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          subject: subject.trim(),
          message: message.trim(),
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const apiError = payload?.error || payload?.errors?.[0]?.msg;
        throw new Error(apiError || "Unable to submit feedback. Please try again.");
      }

      setSubmitMessage("Feedback submitted successfully.");
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
      setCaptchaInput("");
      setCaptchaCode(randomCaptcha());
    } catch (error: any) {
      setSubmitError(error?.message || "Unable to submit feedback. Please try again.");
      refreshCaptcha(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white">
      <form className="space-y-6" onSubmit={handleSubmit}>
        {/* Name */}
        <div>
          <label className="block text-xl font-medium mb-1">
            Your Name (required)
          </label>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full border border-gray-400 px-3 py-2 text-xl focus:outline-none focus:ring-1 focus:ring-gray-500"
            required
          />
        </div>
        {/* Email */}
        <div>
          <label className="block text-xl font-medium mb-1">
            Your Email (required)
          </label>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full border border-gray-400 px-3 py-2 text-xl focus:outline-none focus:ring-1 focus:ring-gray-500"
            required
          />
        </div>
        {/* Subject */}
        <div>
          <label className="block text-xl font-medium mb-1">
            Subject
          </label>
          <input
            type="text"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            className="w-full border border-gray-400 px-3 py-2 text-xl focus:outline-none focus:ring-1 focus:ring-gray-500"
          />
        </div>
        {/* Message */}
        <div>
          <label className="block text-xl font-medium mb-1">
            Your Message (required)
          </label>
          <textarea
            rows={6}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            className="w-full border border-gray-400 px-3 py-2 text-xl focus:outline-none focus:ring-1 focus:ring-gray-500"
            required
          />
        </div>
        {/* Captcha */}
        <div className="flex items-start gap-4 bg-gray-300 p-4 w-fit">
          {/* Captcha Image */}
          <div className="bg-white p-2">
            <div className="mb-2 w-56 h-16 flex items-center justify-center bg-gray-200 border border-gray-300 text-[48px] tracking-[4px] font-semibold leading-none font-mono select-none">
              {captchaCode}
            </div>
          </div>
          {/* Captcha Controls */}
          <div className="flex flex-col gap-2">
            <button
              type="button"
              className="bg-white border px-2 py-1 text-xl"
              title="Audio Captcha"
              onClick={playCaptchaAudio}
            >
              🔊
            </button>
            <button
              type="button"
              className="bg-white border px-2 py-1 text-xl"
              title="Refresh Captcha"
              onClick={() => refreshCaptcha()}
            >
              🔄
            </button>
          </div>
        </div>
        {/* Captcha Input */}
        <div>
          <label className="block text-xl font-medium mb-1">
            Enter Captcha Code
          </label>
          <input
            type="text"
            className="w-64 border border-gray-400 px-3 py-2 text-xl focus:outline-none focus:ring-1 focus:ring-gray-500"
            placeholder="Enter Code"
            maxLength={6}
            value={captchaInput}
            onChange={(event) => {
              setCaptchaInput(event.target.value);
              if (captchaError) setCaptchaError("");
            }}
            required
          />
          {captchaError ? (
            <p className="text-red-700 text-lg mt-2" role="alert" aria-live="assertive">
              {captchaError}
            </p>
          ) : null}
          {submitError ? (
            <p className="text-red-700 text-lg mt-2" role="alert" aria-live="assertive">
              {submitError}
            </p>
          ) : null}
          {submitMessage ? <p className="text-green-700 text-lg mt-2" aria-live="polite">{submitMessage}</p> : null}
        </div>
        {/* Submit */}
        <div>
          <button
            type="submit"
            disabled={submitting}
            className="bg-yellow-500 hover:bg-yellow-600 text-black font-medium px-6 py-2 text-xl"
          >
            {submitting ? "Sending..." : "Send"}
          </button>
        </div>
      </form>
    </div>
  );
}
