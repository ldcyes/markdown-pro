import { Editor } from "./editor/Editor";

export default function App() {
  return (
    <main className="app-shell">
      <section className="hero">
        <p className="hero__eyebrow">Markdown Pro</p>
        <h1 className="hero__title">Tauri-ready writing surface</h1>
        <p className="hero__copy">
          A minimal desktop-editor scaffold with React, TypeScript, and a
          ProseMirror core that already supports headings, emphasis, lists, and
          code blocks.
        </p>
      </section>
      <Editor />
    </main>
  );
}
