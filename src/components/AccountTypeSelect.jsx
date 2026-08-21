import { useEffect, useRef, useState } from "react";
import { ChevronUp, ChevronDown, Check } from "lucide-react";

const ACCOUNT_TYPES = [
  { value: "player", label: "Player" },
  { value: "score-viewing", label: "Score Viewing" },
  { value: "organizer", label: "Organizer" },
];

export default function AccountTypeSelect({ value, onChange, label = "Account Type" }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  const selected =
    ACCOUNT_TYPES.find((opt) => opt.value === value) || ACCOUNT_TYPES[0];

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="account-type-field" ref={wrapperRef}>
      <label className="account-type-label">{label}</label>

      <button
        type="button"
        className="account-type-trigger"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{selected.label}</span>
        {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>

      {open && (
        <ul className="account-type-menu" role="listbox">
          {ACCOUNT_TYPES.map((opt) => {
            const isSelected = opt.value === selected.value;
            return (
              <li
                key={opt.value}
                role="option"
                aria-selected={isSelected}
                className={`account-type-option${isSelected ? " selected" : ""}`}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
              >
                <span>{opt.label}</span>
                {isSelected && <Check size={18} />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
