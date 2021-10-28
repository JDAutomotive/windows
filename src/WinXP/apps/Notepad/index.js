import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';

import { WindowDropDowns } from 'components';
import originalDropDownData from './dropDownData';

export default function Notepad({ onClose }) {
  const [docText, setDocText] = useState('');
  const [wordWrap, setWordWrap] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [caretPos, setCaretPos] = useState([0, 0]);
  const [dropDownData, setDropDownData] = useState(originalDropDownData);

  const textareaRef = useRef();

  useEffect(() => {
    dropDownData.Edit.forEach(option => {
      if (['Cut', 'Copy', 'Delete'].includes(option.text))
        option.disable = !selectedText;
    });
    setDropDownData(dropDownData => dropDownData);
  }, [selectedText, dropDownData.Edit]);

  function onClickOptionItem(item) {
    switch (item) {
      case 'Exit':
        onClose();
        break;
      case 'Word Wrap':
        setWordWrap(!wordWrap);
        break;
      case 'Time/Date':
        const date = new Date();
        insertText(date.toLocaleTimeString() + ' ' + date.toLocaleDateString());
        break;
      case 'Select All':
        textareaRef.current.select();
        break;
      case 'Copy':
        onCopyText();
        break;
      case 'Paste':
        onPasteText();
        break;
      case 'Cut':
        onCopyText();
        onDeleteText();
        break;
      case 'Delete':
        onDeleteText();
        break;
      default:
    }
  }

  function onCopyText() {
    navigator.clipboard.writeText(selectedText);
    setSelectedText('');
  }

  async function onPasteText() {
    const copiedText = await navigator.clipboard.readText();
    insertText(copiedText);
    setSelectedText('');
  }

  function insertText(text) {
    const { value } = textareaRef.current;
    if (selectedText) {
      setDocText(
        value.substring(0, caretPos[0]) + text + value.substring(caretPos[1]),
      );
    } else {
      setDocText(
        value.substring(0, caretPos[0]) + text + value.substring(caretPos[0]),
      );
    }
  }

  function onDeleteText() {
    setDocText(textareaRef.current.value.replace(selectedText, ''));
    setSelectedText('');
  }

  function onTextAreaKeyDown(e) {
    // handle tabs in text area
    if (e.which === 9) {
      e.preventDefault();
      e.persist();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      setDocText(`${docText.substring(0, start)}\t${docText.substring(end)}`);

      // asynchronously update textarea selection to include tab
      // workaround due to https://github.com/facebook/react/issues/14174
      requestAnimationFrame(() => {
        e.target.selectionStart = start + 1;
        e.target.selectionEnd = start + 1;
      });
    }
  }

  return (
    <Div>
      <section className="np__toolbar">
        <WindowDropDowns items={dropDownData} onClickItem={onClickOptionItem} />
      </section>
      <StyledTextarea
        ref={textareaRef}
        wordWrap={wordWrap}
        value={docText}
        onChange={e => setDocText(e.target.value)}
        onKeyDown={onTextAreaKeyDown}
        onSelect={e => {
          setSelectedText(
            e.target.value.substring(
              e.target.selectionStart,
              e.target.selectionEnd,
            ),
          );
          setCaretPos([e.target.selectionStart, e.target.selectionEnd]);
        }}
        spellCheck={false}
      />
    </Div>
  );
}

const Div = styled.div`
  height: 100%;
  background: linear-gradient(to right, #edede5 0%, #ede8cd 100%);
  display: flex;
  flex-direction: column;
  align-items: stretch;
  .np__toolbar {
    position: relative;
    height: 21px;
    flex-shrink: 0;
    border-bottom: 1px solid white;
  }
`;

const StyledTextarea = styled.textarea`
  flex: auto;
  outline: none;
  font-family: 'Lucida Console', monospace;
  font-size: 13px;
  line-height: 14px;
  resize: none;
  padding: 2px;
  ${props => (props.wordWrap ? '' : 'white-space: nowrap; overflow-x: scroll;')}
  overflow-y: scroll;
  border: 1px solid #96abff;
`;
