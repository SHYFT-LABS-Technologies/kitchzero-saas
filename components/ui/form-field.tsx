// components/ui/form-field.tsx
"use client"

import React, { useState } from "react"
import { AlertCircle } from "lucide-react"

interface FormFieldProps {
  label: string
  name: string
  type?: string
  value: string | number
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void
  placeholder?: string
  required?: boolean
  error?: string
  options?: { value: string; label: string }[] // For select fields
  className?: string
  helpText?: string
  as?: 'input' | 'select' | 'textarea'
  rows?: number // For textarea
}

export function FormField({
  label,
  name,
  type = "text",
  value,
  onChange,
  placeholder,
  required = false,
  error,
  options,
  className = "",
  helpText,
  as = 'input',
  rows = 3
}: FormFieldProps) {
  const [focused, setFocused] = useState(false)
  
  const baseInputClasses = `
    w-full px-4 py-3 border rounded-xl transition-all duration-200 text-sm
    ${error 
      ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-500/20' 
      : focused
        ? 'border-kitchzero-primary bg-white focus:border-kitchzero-primary focus:ring-kitchzero-primary/20'
        : 'border-slate-200 bg-slate-50 hover:border-slate-300 focus:border-kitchzero-primary focus:ring-kitchzero-primary/20'
    }
    focus:outline-none focus:ring-2
    ${className}
  `

  const renderInput = () => {
    if (as === 'select' && options) {
      return (
        <select
          name={name}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={baseInputClasses}
          required={required}
        >
          <option value="">{placeholder || `Select ${label}`}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )
    }

    if (as === 'textarea') {
      return (
        <textarea
          name={name}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          rows={rows}
          className={baseInputClasses}
          required={required}
        />
      )
    }

    return (
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        className={baseInputClasses}
        required={required}
        step={type === 'number' ? '0.01' : undefined}
      />
    )
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-slate-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      {renderInput()}
      
      {error && (
        <div className="flex items-center gap-2 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      
      {helpText && !error && (
        <p className="text-xs text-slate-500">{helpText}</p>
      )}
    </div>
  )
}