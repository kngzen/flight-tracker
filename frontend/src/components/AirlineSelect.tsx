import AsyncSelect from "react-select/async";
import { searchAirlines } from "../lib/api";
import { Airline } from "../types";

interface Option {
  value: string;
  label: string;
}

interface Props {
  value?: string | null;
  onChange: (iata: string | null) => void;
  placeholder?: string;
}

export default function AirlineSelect({ value, onChange, placeholder = "Search airline..." }: Props) {
  const loadOptions = async (inputValue: string): Promise<Option[]> => {
    if (inputValue.length < 2) return [];
    const airlines = await searchAirlines(inputValue);
    return airlines.map((a: Airline) => ({
      value: a.iata || a.icao || String(a.id),
      label: `${a.iata || a.icao || "?"} — ${a.name}${a.country ? ` (${a.country})` : ""}`,
    }));
  };

  const currentValue = value ? { value, label: value } : null;

  return (
    <AsyncSelect
      classNamePrefix="react-select"
      className="react-select-container"
      cacheOptions
      loadOptions={loadOptions}
      defaultOptions={false}
      value={currentValue}
      onChange={(opt) => onChange(opt ? opt.value : null)}
      placeholder={placeholder}
      isClearable
      noOptionsMessage={({ inputValue }) =>
        inputValue.length < 2 ? "Type at least 2 characters..." : "No airlines found"
      }
    />
  );
}
