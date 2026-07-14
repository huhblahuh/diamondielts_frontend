import React, { useImperativeHandle, forwardRef, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { Node, mergeAttributes } from '@tiptap/core';

// The awesome GapNode extension
const GapNode = Node.create({
  name: 'gap',
  group: 'inline',
  inline: true,
  selectable: true,
  atom: true, // deletes as a single block
  
  addAttributes() {
    return {
      id: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-gap-id]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { class: 'gap-badge', 'data-gap-id': HTMLAttributes.id }), ` [${HTMLAttributes.id}] `];
  },
  
  // This is crucial: when calling editor.getText(), what should this output?
  renderText({ node }) {
    return ` [${node.attrs.id}] `;
  }
});

const TiptapEditor = forwardRef(({ value, onChange, placeholder, minHeight = '150px' }, ref) => {
  const isInternalChange = React.useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      GapNode,
    ],
    content: value,
    onUpdate: ({ editor }) => {
      isInternalChange.current = true;
      // Pass the HTML back to parent
      onChange(editor.getHTML(), editor);
    },
    editorProps: {
      attributes: {
        class: 'tiptap-editor-content',
        style: `min-height: ${minHeight}; padding: 1rem; outline: none;`,
      },
    },
  });

  // Expose functions to the parent (ExerciseManagement)
  useImperativeHandle(ref, () => ({
    getEditor: () => editor,
    insertGap: (id) => {
      if (editor) {
        editor.chain().focus().insertContent({
          type: 'gap',
          attrs: { id: id }
        }).run();
      }
    },
    getGapIds: () => {
      if (!editor) return [];
      const ids = [];
      editor.state.doc.descendants((node) => {
        if (node.type.name === 'gap') {
          ids.push(node.attrs.id);
        }
      });
      return ids;
    }
  }));

  // Update editor content when `value` prop changes externally
  // (e.g. when switching from add-mode to edit-mode)
  useEffect(() => {
    if (!editor) return;
    // If the change came from user typing inside editor, skip (avoid cursor jumps)
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }
    // Otherwise it's an external change (parent set a new value) — always sync
    const currentHtml = editor.getHTML();
    if (value !== currentHtml) {
      editor.commands.setContent(value || '', false);
    }
  }, [value, editor]);

  if (!editor) {
    return null;
  }

  // Define placeholder manually if content is empty
  const isEmpty = editor.isEmpty;

  return (
    <div className="tiptap-wrapper" style={{ border: '1.5px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', background: '#fff', transition: 'border 0.2s' }}>
      {/* Custom Toolbar */}
      <div className="tiptap-toolbar" style={{ borderBottom: '1px solid #e2e8f0', padding: '0.5rem', background: '#f8fafc', display: 'flex', gap: '0.5rem' }}>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          style={{ padding: '0.2rem 0.5rem', background: editor.isActive('bold') ? '#e2e8f0' : 'transparent', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          B
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          style={{ padding: '0.2rem 0.5rem', background: editor.isActive('italic') ? '#e2e8f0' : 'transparent', border: 'none', borderRadius: '4px', cursor: 'pointer', fontStyle: 'italic' }}
        >
          I
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          style={{ padding: '0.2rem 0.5rem', background: editor.isActive('underline') ? '#e2e8f0' : 'transparent', border: 'none', borderRadius: '4px', cursor: 'pointer', textDecoration: 'underline' }}
        >
          U
        </button>
        <div style={{ width: '1px', background: '#cbd5e1', margin: '0 0.5rem' }}></div>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          style={{ padding: '0.2rem 0.5rem', background: editor.isActive('bulletList') ? '#e2e8f0' : 'transparent', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          <i className="bi bi-list-ul"></i>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          style={{ padding: '0.2rem 0.5rem', background: editor.isActive('orderedList') ? '#e2e8f0' : 'transparent', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          <i className="bi bi-list-ol"></i>
        </button>
      </div>

      {/* Editor Content */}
      <div style={{position: 'relative'}}>
          {isEmpty && placeholder && (
              <div style={{position: 'absolute', top: '1rem', left: '1rem', color: '#94a3b8', pointerEvents: 'none'}}>
                  {placeholder}
              </div>
          )}
          <EditorContent editor={editor} />
      </div>
    </div>
  );
});

export default TiptapEditor;
