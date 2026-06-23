import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number, symbol = '$'): string {
  return `${symbol}${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatCurrencyRounded(value: number, symbol = '$'): string {
  return `${symbol}${Math.round(value).toLocaleString('en-US')}`
}

export function formatMonth(monthNumber: number): string {
  const date = new Date()
  date.setMonth(date.getMonth() + monthNumber)
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}
