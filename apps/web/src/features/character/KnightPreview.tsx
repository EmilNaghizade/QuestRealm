import { useState } from "react";
import "./knight-preview.css";

export default function KnightPreview() {
  const [armorEquipped, setArmorEquipped] = useState(false);
  const [swordEquipped, setSwordEquipped] = useState(false);

  return (
    <section
      className="card knight-preview"
      aria-labelledby="knight-preview-title"
    >
      <div className="section-heading">
        <h2 id="knight-preview-title">Knight fitting room</h2>
      </div>
      <p className="muted">
        Try a look for your next adventure. This preview resets when you leave
        the dashboard. Equipment purchases are coming later.
      </p>
      <div
        className="knight-preview-stage"
        role="img"
        aria-label={`Knight wearing ${armorEquipped ? "steel armor" : "a green tunic"}${swordEquipped ? " and holding a sword" : ""}`}
      >
        <img src="/characters/knight/base.png" alt="" draggable={false} />
        {armorEquipped && (
          <img src="/characters/knight/armor.png" alt="" draggable={false} />
        )}
        {swordEquipped && (
          <img
            className="knight-preview-sword"
            src="/characters/knight/sword.png"
            alt=""
            draggable={false}
          />
        )}
      </div>
      <div className="knight-preview-controls">
        <button
          type="button"
          className="button button-secondary"
          aria-pressed={armorEquipped}
          onClick={() => setArmorEquipped((equipped) => !equipped)}
        >
          {armorEquipped ? "Remove armor" : "Try armor"}
        </button>
        <button
          type="button"
          className="button button-secondary"
          aria-pressed={swordEquipped}
          onClick={() => setSwordEquipped((equipped) => !equipped)}
        >
          {swordEquipped ? "Remove sword" : "Try sword"}
        </button>
      </div>
    </section>
  );
}
