import {
  Add20Filled,
  Add20Regular,
  Apps20Color,
  Apps20Regular,
  ArrowCollapseAll20Regular,
  ArrowCounterclockwise20Regular,
  ArrowDownload20Filled,
  ArrowDownload20Regular,
  ArrowExpandAll20Regular,
  ArrowRedo20Regular,
  ArrowUndo20Regular,
  ArrowUpload20Filled,
  ArrowUpload20Regular,
  Book20Regular,
  BoxCheckmark20Regular,
  BoxMultiple20Regular,
  Briefcase20Regular,
  Checkmark20Filled,
  Checkmark20Regular,
  ChevronDown20Regular,
  ChevronRight20Regular,
  Clipboard20Color,
  Clipboard20Regular,
  Code20Regular,
  Color20Regular,
  Copy20Regular,
  Database20Color,
  Database20Regular,
  Delete20Filled,
  Delete20Regular,
  Dismiss20Filled,
  Dismiss20Regular,
  Document20Color,
  Document20Regular,
  Edit20Color,
  Edit20Regular,
  Folder20Filled,
  Folder20Regular,
  Globe20Color,
  Globe20Regular,
  Grid20Regular,
  Heart20Regular,
  Home20Color,
  Home20Regular,
  Image20Color,
  Image20Regular,
  Lightbulb20Regular,
  Location20Filled,
  Location20Regular,
  LockClosed20Color,
  LockClosed20Regular,
  LockOpen20Filled,
  LockOpen20Regular,
  MusicNote220Regular,
  Open20Regular,
  Options20Color,
  Options20Regular,
  PaintBrush20Color,
  PaintBrush20Regular,
  Pin20Color,
  Pin20Regular,
  PinOff20Filled,
  PinOff20Regular,
  QuestionCircle20Color,
  QuestionCircle20Regular,
  ReOrderDotsVertical20Regular,
  Search20Filled,
  Search20Regular,
  Settings20Color,
  Settings20Regular,
  Star20Color,
  Star20Regular,
  StarOff20Regular,
  TextBulletList20Regular,
  WeatherMoon20Filled,
  WeatherMoon20Regular,
  WeatherSunny20Filled,
  WeatherSunny20Regular,
  Window20Regular,
  WindowHeaderHorizontal20Regular,
  Bookmark20Color,
  Bookmark20Regular,
} from '@fluentui/react-icons';
import { adaptSvgIcon, type ThemeIconPack } from '../types';

const F = (Icon: Parameters<typeof adaptSvgIcon>[0]) => adaptSvgIcon(Icon, 'fluent');

/**
 * Windows Fluent — official Fluent System Icons (MIT).
 *
 * Prefer Color glyphs for primary chrome (toolbar / settings header / system tabs)
 * so Fluent is visually distinct from Lucide stroke. Fall back to Filled/Regular
 * when Color is unavailable. Used app-wide via ThemeIcon when themeId === 'fluent'.
 */
export const fluentIconPack: ThemeIconPack = {
  settings: F(Settings20Color),
  search: F(Search20Filled),
  add: F(Add20Filled),
  star: F(Star20Color),
  starOff: F(StarOff20Regular),
  trash: F(Delete20Filled),
  home: F(Home20Color),
  box: F(BoxMultiple20Regular),
  folder: F(Folder20Filled),
  document: F(Document20Color),
  clipboard: F(Clipboard20Color),
  undo: F(ArrowUndo20Regular),
  redo: F(ArrowRedo20Regular),
  lock: F(LockClosed20Color),
  unlock: F(LockOpen20Filled),
  sun: F(WeatherSunny20Filled),
  moon: F(WeatherMoon20Filled),
  check: F(Checkmark20Filled),
  close: F(Dismiss20Filled),
  chevronRight: F(ChevronRight20Regular),
  chevronDown: F(ChevronDown20Regular),
  database: F(Database20Color),
  options: F(Options20Color),
  paintBrush: F(PaintBrush20Color),
  help: F(QuestionCircle20Color),
  upload: F(ArrowUpload20Filled),
  download: F(ArrowDownload20Filled),
  globe: F(Globe20Color),
  pin: F(Pin20Color),
  pinOff: F(PinOff20Filled),
  edit: F(Edit20Color),
  copy: F(Copy20Regular),
  externalLink: F(Open20Regular),
  locate: F(Location20Filled),
  image: F(Image20Color),
  apps: F(Apps20Color),
  window: F(Window20Regular),
  bookmark: F(Bookmark20Color),
  palette: F(Color20Regular),
  rotateCcw: F(ArrowCounterclockwise20Regular),
  fileDown: F(ArrowDownload20Filled),
  fileUp: F(ArrowUpload20Filled),
  list: F(TextBulletList20Regular),
  layoutGrid: F(Grid20Regular),
  collapse: F(ArrowCollapseAll20Regular),
  expand: F(ArrowExpandAll20Regular),
  grip: F(ReOrderDotsVertical20Regular),
  packageCheck: F(BoxCheckmark20Regular),
  panel: F(WindowHeaderHorizontal20Regular),
  heart: F(Heart20Regular),
  music: F(MusicNote220Regular),
  book: F(Book20Regular),
  idea: F(Lightbulb20Regular),
  code: F(Code20Regular),
  briefcase: F(Briefcase20Regular),
};

void Settings20Regular;
void Search20Regular;
void Add20Regular;
void Star20Regular;
void Delete20Regular;
void Home20Regular;
void Folder20Regular;
void Document20Regular;
void Clipboard20Regular;
void LockClosed20Regular;
void LockOpen20Regular;
void WeatherSunny20Regular;
void WeatherMoon20Regular;
void Checkmark20Regular;
void Dismiss20Regular;
void Database20Regular;
void Options20Regular;
void PaintBrush20Regular;
void QuestionCircle20Regular;
void ArrowUpload20Regular;
void ArrowDownload20Regular;
void Globe20Regular;
void Pin20Regular;
void PinOff20Regular;
void Edit20Regular;
void Location20Regular;
void Image20Regular;
void Apps20Regular;
void Bookmark20Regular;
