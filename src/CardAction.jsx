import React from 'react';
import './card-actions.css';

// A stretched native control makes the card clickable without nesting its other actions.
export default function CardAction({label,onOpen,href,external=false,disabled=false}) {
  if(href&&!disabled)return <a className="card-open-target" aria-label={label} href={href} target={external?'_blank':undefined} rel={external?'noopener noreferrer':undefined}/>;
  return <button type="button" className="card-open-target" aria-label={label} disabled={disabled} onClick={onOpen}/>;
}
