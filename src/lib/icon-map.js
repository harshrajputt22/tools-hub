import {
  AlignLeft,
  ArrowRight,
  Braces,
  CheckCircle,
  ChevronRight,
  Clock,
  Code,
  Code2,
  Columns,
  Cpu,
  Database,
  FileCode,
  FileSpreadsheet,
  FileText,
  GitBranch,
  GitMerge,
  Globe,
  Hash,
  Image,
  Key,
  Layout,
  Layers,
  Link,
  Lock,
  Maximize,
  Minimize2,
  MousePointer,
  Paintbrush,
  Palette,
  Puzzle,
  Radio,
  RefreshCw,
  Rocket,
  Search,
  Settings,
  Shield,
  ShieldCheck,
  Shuffle,
  Sparkles,
  Square,
  Star,
  Table,
  Tag,
  Terminal,
  Unlock,
  Wrench,
  Zap,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// Single lookup map for ALL icons used anywhere in the app.
// Keys are plain strings — safe to store in config files.
// Values are Lucide components — only resolved at render time,
// never passed across the RSC → Client boundary.
// ─────────────────────────────────────────────────────────────

export const iconMap = {
  AlignLeft,
  ArrowRight,
  Braces,
  CheckCircle,
  ChevronRight,
  Clock,
  Code,
  Code2,
  Columns,
  Cpu,
  Database,
  FileCode,
  FileSpreadsheet,
  FileText,
  GitBranch,
  GitMerge,
  Globe,
  Hash,
  Image,
  Key,
  Layout,
  Layers,
  Link,
  Lock,
  Maximize,
  Minimize2,
  MousePointer,
  Paintbrush,
  Palette,
  Puzzle,
  Radio,
  RefreshCw,
  Rocket,
  Search,
  Settings,
  Shield,
  ShieldCheck,
  Shuffle,
  Sparkles,
  Square,
  Star,
  Table,
  Tag,
  Terminal,
  Unlock,
  Wrench,
  Zap,
};

// ── Helper ────────────────────────────────────────────────────
// Usage:
//   import { getIcon } from "@/lib/icon-map";
//   const Icon = getIcon(tool.icon);   // or cat.icon
//   return <Icon size={18} />;

export function getIcon(name, fallback = Braces) {
  return iconMap[name] ?? fallback;
}

// Keep old export name working for any files already using it
export const getToolIcon = getIcon;