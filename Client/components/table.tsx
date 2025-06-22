"use client"

import type { ReactNode } from "react"

interface TableProps {
  children: ReactNode
  className?: string
}

interface TableHeaderProps {
  children: ReactNode
}

interface TableBodyProps {
  children: ReactNode
}

interface TableRowProps {
  children: ReactNode
  onClick?: () => void
  className?: string
}

interface TableCellProps {
  children: ReactNode
  className?: string
}

interface TableHeadProps {
  children: ReactNode
  className?: string
}

export function Table({ children, className = "" }: TableProps) {
  return (
    <div className="overflow-x-auto">
      <table className={`min-w-full divide-y divide-gray-200 ${className}`}>{children}</table>
    </div>
  )
}

export function TableHeader({ children }: TableHeaderProps) {
  return <thead className="bg-gray-50">{children}</thead>
}

export function TableBody({ children }: TableBodyProps) {
  return <tbody className="bg-white divide-y divide-gray-200">{children}</tbody>
}

export function TableRow({ children, onClick, className = "" }: TableRowProps) {
  return (
    <tr className={`${onClick ? "hover:bg-gray-50 cursor-pointer" : ""} ${className}`} onClick={onClick}>
      {children}
    </tr>
  )
}

export function TableHead({ children, className = "" }: TableHeadProps) {
  return (
    <th className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${className}`}>
      {children}
    </th>
  )
}

export function TableCell({ children, className = "" }: TableCellProps) {
  return <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900 ${className}`}>{children}</td>
}
