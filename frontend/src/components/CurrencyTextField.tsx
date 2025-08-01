import React, { useState, useEffect } from "react";
import { TextField, InputAdornment, Typography } from "@mui/material";

interface CurrencyTextFieldProps {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  error?: boolean;
  helperText?: string;
  fullWidth?: boolean;
  disabled?: boolean;
  required?: boolean;
  margin?: "none" | "dense" | "normal";
  variant?: "outlined" | "filled" | "standard";
  inputProps?: any;
}

const CurrencyTextField: React.FC<CurrencyTextFieldProps> = ({
  label,
  value,
  onChange,
  error = false,
  helperText,
  fullWidth = true,
  disabled = false,
  required = false,
  margin = "normal",
  variant = "outlined",
  inputProps = {},
}) => {
  const [displayValue, setDisplayValue] = useState("");

  // Convert numeric value to display format
  const formatForDisplay = (val: string | number): string => {
    if (val === "" || val === null || val === undefined) return "";

    const numValue = typeof val === "string" ? parseFloat(val) : val;
    if (isNaN(numValue)) return "";

    // Format with proper negative sign placement
    const absValue = Math.abs(numValue);
    const formatted = absValue.toFixed(2);
    const isNegative = numValue < 0;

    return isNegative ? `-$${formatted}` : `$${formatted}`;
  };

  // Convert display format back to numeric string
  const parseFromDisplay = (displayVal: string): string => {
    if (!displayVal) return "";

    // Remove currency symbol and spaces
    const cleanValue = displayVal.replace(/[$,]/g, "");

    // Handle negative values
    if (cleanValue.startsWith("-")) {
      const numValue = parseFloat(cleanValue.substring(1));
      return isNaN(numValue) ? "" : (-numValue).toString();
    }

    const numValue = parseFloat(cleanValue);
    return isNaN(numValue) ? "" : numValue.toString();
  };

  // Update display value when prop value changes
  useEffect(() => {
    setDisplayValue(formatForDisplay(value));
  }, [value]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = event.target.value;

    // Allow empty input
    if (!inputValue) {
      setDisplayValue("");
      onChange("");
      return;
    }

    // Allow typing negative sign at the beginning
    if (inputValue === "-") {
      setDisplayValue("-");
      return;
    }

    // Allow typing dollar sign
    if (inputValue === "$") {
      setDisplayValue("$");
      return;
    }

    // Allow typing negative dollar sign
    if (inputValue === "-$") {
      setDisplayValue("-$");
      return;
    }

    // Parse the input and format it
    const numericValue = parseFromDisplay(inputValue);
    if (numericValue !== "") {
      const formatted = formatForDisplay(numericValue);
      setDisplayValue(formatted);
      onChange(numericValue);
    } else {
      // If it's not a valid number, just update display (user might be typing)
      setDisplayValue(inputValue);
    }
  };

  const handleBlur = () => {
    // On blur, ensure the value is properly formatted
    const numericValue = parseFromDisplay(displayValue);
    if (numericValue !== "") {
      const formatted = formatForDisplay(numericValue);
      setDisplayValue(formatted);
      onChange(numericValue);
    } else {
      setDisplayValue("");
      onChange("");
    }
  };

  return (
    <TextField
      label={label}
      value={displayValue}
      onChange={handleChange}
      onBlur={handleBlur}
      error={error}
      helperText={helperText}
      fullWidth={fullWidth}
      disabled={disabled}
      required={required}
      margin={margin}
      variant={variant}
      inputProps={{
        ...inputProps,
        // Remove type="number" to allow proper formatting
        type: "text",
      }}
    />
  );
};

export default CurrencyTextField;
