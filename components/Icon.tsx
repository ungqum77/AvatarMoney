// 앱에 내장된 아이콘(SVG). 외부 폰트를 쓰지 않으므로
// 오프라인·느린 네트워크에서도 영어 단어가 그대로 보이는 일이 없다.
import {
  Activity,
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Calculator,
  Check,
  CheckCircle2,
  CircleUserRound,
  Copy,
  Eye,
  EyeOff,
  FolderOpen,
  History,
  Home,
  LogIn,
  LogOut,
  Minus,
  MonitorPlay,
  PiggyBank,
  Plus,
  PlusCircle,
  Save,
  Share,
  Shield,
  SlidersHorizontal,
  Smartphone,
  Smile,
  Trash2,
  TrendingUp,
  User,
  X,
  type LucideIcon,
} from "lucide-react";

const ICONS = {
  account_circle: CircleUserRound,
  add: Plus,
  add_circle: PlusCircle,
  arrow_back: ArrowLeft,
  arrow_forward: ArrowRight,
  calculate: Calculator,
  check: Check,
  check_circle: CheckCircle2,
  close: X,
  content_copy: Copy,
  delete: Trash2,
  error: AlertCircle,
  folder_open: FolderOpen,
  history: History,
  home: Home,
  install_mobile: Smartphone,
  ios_share: Share,
  login: LogIn,
  logout: LogOut,
  person: User,
  present_to_all: MonitorPlay,
  remove: Minus,
  save: Save,
  savings: PiggyBank,
  sentiment_satisfied: Smile,
  shield: Shield,
  south: ArrowDown,
  timeline: Activity,
  trending_up: TrendingUp,
  tune: SlidersHorizontal,
  visibility: Eye,
  visibility_off: EyeOff,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

export default function Icon({
  name,
  size = 24,
  strokeWidth = 2.25,
  className,
}: {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  const Svg = ICONS[name];
  return (
    <Svg
      size={size}
      strokeWidth={strokeWidth}
      className={className}
      aria-hidden="true"
      focusable="false"
      // 60대 기준: 아이콘이 글자 옆에서 밀리지 않도록 크기를 고정한다.
      style={{ flexShrink: 0 }}
    />
  );
}
