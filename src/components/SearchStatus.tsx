import React from "react";

interface SearchStatusProps {
  location: string | null;
}

const SearchStatus: React.FC<SearchStatusProps> = ({ location }) => {
  return (
    <div>
      <p className="text-gray-600">
        Searching for a user from {location || "an unknown location"}...
      </p>
    </div>
  );
};

export default SearchStatus;
