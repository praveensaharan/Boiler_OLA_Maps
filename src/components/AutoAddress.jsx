import React, { useState, useEffect } from "react";
import axios from "axios";
import debounce from "lodash.debounce";

const AddressAutocomplete = ({ onSelect }) => {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [isSuggestionVisible, setSuggestionVisible] = useState(false);

  const ApiKey = process.env.OLA_API;

  const fetchSuggestions = debounce(async (query) => {
    try {
      const response = await axios.get(
        `https://api.olamaps.io/places/v1/autocomplete`,
        {
          params: {
            input: query,
            api_key: ApiKey,
          },
        }
      );

      const uniqueSuggestions = Array.from(
        new Map(
          response.data.predictions.map((item) => [item.place_id, item])
        ).values()
      );

      setSuggestions(uniqueSuggestions);
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      setSuggestions([]);
    }
  }, 300);

  useEffect(() => {
    if (query.length < 3) {
      setSuggestions([]);
      setSuggestionVisible(false);
      return;
    }

    fetchSuggestions(query);
    setSuggestionVisible(true);

    return () => {
      fetchSuggestions.cancel();
    };
  }, [query]);

  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion.description);
    setSuggestions([]);
    setSuggestionVisible(false);
    onSelect(suggestion);
  };

  return (
    <div className="relative w-full max-w-md mx-auto my-4">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Enter address"
        className="w-full p-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:border-blue-500"
      />
      {isSuggestionVisible && suggestions.length > 0 && (
        <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((suggestion) => (
            <li
              key={suggestion.place_id}
              className="p-2 cursor-pointer hover:bg-gray-200"
              onClick={() => handleSuggestionClick(suggestion)}
            >
              {suggestion.description}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AddressAutocomplete;
