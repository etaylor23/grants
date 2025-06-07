import React from "react";
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
} from "@mui/material";
import { Grant } from "../../models/types";
import { mockGrants } from "../../api/mockData";

interface GrantSelectorProps {
  selectedGrant: Grant | null;
  onGrantChange: (grant: Grant | null) => void;
}

export const GrantSelector: React.FC<GrantSelectorProps> = ({
  selectedGrant,
  onGrantChange,
}) => {
  const handleChange = (event: SelectChangeEvent<string>) => {
    const grantId = event.target.value;
    if (grantId === "") {
      onGrantChange(null);
    } else {
      const grant = mockGrants.find((g) => g.id === grantId);
      onGrantChange(grant || null);
    }
  };

  return (
    <Box sx={{ mb: 3 }}>
      <FormControl fullWidth>
        <InputLabel id="grant-select-label">Select Grant</InputLabel>
        <Select
          labelId="grant-select-label"
          id="grant-select"
          value={selectedGrant?.id || ""}
          label="Select Grant"
          onChange={handleChange}
          sx={{
            "& .MuiSelect-select": {
              color: "inherit",
            },
            "& .MuiMenuItem-root": {
              color: "inherit",
            },
          }}
        >
          <MenuItem value="">
            <em>Select a grant to view</em>
          </MenuItem>
          {mockGrants.map((grant) => (
            <MenuItem key={grant.id} value={grant.id}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Box
                  sx={{
                    width: 16,
                    height: 16,
                    backgroundColor: grant.color,
                    borderRadius: "50%",
                  }}
                />
                {grant.name}
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
};
