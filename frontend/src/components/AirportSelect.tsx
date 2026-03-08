import AsyncSelect from "react-select/async";
import { searchAirports } from "../lib/api";
import { Airport } from "../types";

interface Option {
  value: string;
  label: string;
  airport: Airport;
}

interface Props {
  value?: string | null;
  onChange: (iata: string | null) => void;
  placeholder?: string;
}

export default function AirportSelect({ value, onChange, placeholder = "Search airport..." }: Props) {
  const loadOptions = async (inputValue: string): Promise<Option[]> => {
    if (inputValue.length < 2) return [];
    const airports = await searchAirports(inputValue);
    return airports.map((a: Airport) => ({
      value: a.iata || a.icao || String(a.id),
      label: `${a.iata || a.icao} — ${a.name}${a.city ? `, ${a.city}` : ""}${a.country ? ` (${a.country})` : ""}`,
      airport: a,
    }));
  };

  const currentValue = value
    ? { value, label: value, airport: null as unknown as Airport }
    : null;

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
        inputValue.length < 2 ? "Type at least 2 characters..." : "No airports found"
      }
    />
  );
}
