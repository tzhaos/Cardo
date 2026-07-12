import AddRounded from '@mui/icons-material/AddRounded';
import AppsRounded from '@mui/icons-material/AppsRounded';
import BookmarkBorderRounded from '@mui/icons-material/BookmarkBorderRounded';
import BrushRounded from '@mui/icons-material/BrushRounded';
import CheckRounded from '@mui/icons-material/CheckRounded';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded';
import CloseRounded from '@mui/icons-material/CloseRounded';
import CodeRounded from '@mui/icons-material/CodeRounded';
import ContentCopyRounded from '@mui/icons-material/ContentCopyRounded';
import ContentPasteRounded from '@mui/icons-material/ContentPasteRounded';
import DarkModeRounded from '@mui/icons-material/DarkModeRounded';
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import DescriptionRounded from '@mui/icons-material/DescriptionRounded';
import DownloadRounded from '@mui/icons-material/DownloadRounded';
import DragIndicatorRounded from '@mui/icons-material/DragIndicatorRounded';
import EditRounded from '@mui/icons-material/EditRounded';
import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded';
import FavoriteBorderRounded from '@mui/icons-material/FavoriteBorderRounded';
import FolderRounded from '@mui/icons-material/FolderRounded';
import GridViewRounded from '@mui/icons-material/GridViewRounded';
import HelpOutlineRounded from '@mui/icons-material/HelpOutlineRounded';
import HomeRounded from '@mui/icons-material/HomeRounded';
import ImageRounded from '@mui/icons-material/ImageRounded';
import Inventory2Rounded from '@mui/icons-material/Inventory2Rounded';
import LanguageRounded from '@mui/icons-material/LanguageRounded';
import LightModeRounded from '@mui/icons-material/LightModeRounded';
import LightbulbRounded from '@mui/icons-material/LightbulbRounded';
import LockOpenRounded from '@mui/icons-material/LockOpenRounded';
import LockRounded from '@mui/icons-material/LockRounded';
import MenuBookRounded from '@mui/icons-material/MenuBookRounded';
import MusicNoteRounded from '@mui/icons-material/MusicNoteRounded';
import MyLocationRounded from '@mui/icons-material/MyLocationRounded';
import OpenInNewRounded from '@mui/icons-material/OpenInNewRounded';
import PaletteRounded from '@mui/icons-material/PaletteRounded';
import PushPin from '@mui/icons-material/PushPin';
import PushPinRounded from '@mui/icons-material/PushPinRounded';
import RedoRounded from '@mui/icons-material/RedoRounded';
import RestartAltRounded from '@mui/icons-material/RestartAltRounded';
import SearchRounded from '@mui/icons-material/SearchRounded';
import SettingsRounded from '@mui/icons-material/SettingsRounded';
import StarBorderRounded from '@mui/icons-material/StarBorderRounded';
import StarRounded from '@mui/icons-material/StarRounded';
import StorageRounded from '@mui/icons-material/StorageRounded';
import TuneRounded from '@mui/icons-material/TuneRounded';
import UndoRounded from '@mui/icons-material/UndoRounded';
import UnfoldLessRounded from '@mui/icons-material/UnfoldLessRounded';
import UnfoldMoreRounded from '@mui/icons-material/UnfoldMoreRounded';
import UploadRounded from '@mui/icons-material/UploadRounded';
import ViewListRounded from '@mui/icons-material/ViewListRounded';
import WebAssetRounded from '@mui/icons-material/WebAssetRounded';
import WorkOutlineRounded from '@mui/icons-material/WorkOutlineRounded';
import { adaptSvgIcon, type ThemeIconPack } from '../types';

// MUI OverridableComponent is not assignable to ComponentType without a cast.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const M = (Icon: any) => adaptSvgIcon(Icon, 'mui');

/**
 * Material / AI Studio — official Material Icons (Rounded).
 * Used app-wide via ThemeIcon when themeId === 'material' (toolbar, boxes,
 * menus, settings header/search — not limited to settings nav).
 */
export const materialIconPack: ThemeIconPack = {
  settings: M(SettingsRounded),
  search: M(SearchRounded),
  add: M(AddRounded),
  star: M(StarBorderRounded),
  starOff: M(StarRounded),
  trash: M(DeleteOutlineRounded),
  home: M(HomeRounded),
  box: M(Inventory2Rounded),
  folder: M(FolderRounded),
  document: M(DescriptionRounded),
  clipboard: M(ContentPasteRounded),
  undo: M(UndoRounded),
  redo: M(RedoRounded),
  lock: M(LockRounded),
  unlock: M(LockOpenRounded),
  sun: M(LightModeRounded),
  moon: M(DarkModeRounded),
  check: M(CheckRounded),
  close: M(CloseRounded),
  chevronRight: M(ChevronRightRounded),
  chevronDown: M(ExpandMoreRounded),
  database: M(StorageRounded),
  options: M(TuneRounded),
  paintBrush: M(BrushRounded),
  help: M(HelpOutlineRounded),
  upload: M(UploadRounded),
  download: M(DownloadRounded),
  globe: M(LanguageRounded),
  pin: M(PushPinRounded),
  pinOff: M(PushPin),
  edit: M(EditRounded),
  copy: M(ContentCopyRounded),
  externalLink: M(OpenInNewRounded),
  locate: M(MyLocationRounded),
  image: M(ImageRounded),
  apps: M(AppsRounded),
  window: M(WebAssetRounded),
  bookmark: M(BookmarkBorderRounded),
  palette: M(PaletteRounded),
  rotateCcw: M(RestartAltRounded),
  fileDown: M(DownloadRounded),
  fileUp: M(UploadRounded),
  list: M(ViewListRounded),
  layoutGrid: M(GridViewRounded),
  collapse: M(UnfoldLessRounded),
  expand: M(UnfoldMoreRounded),
  grip: M(DragIndicatorRounded),
  packageCheck: M(CheckCircleRounded),
  panel: M(WebAssetRounded),
  heart: M(FavoriteBorderRounded),
  music: M(MusicNoteRounded),
  book: M(MenuBookRounded),
  idea: M(LightbulbRounded),
  code: M(CodeRounded),
  briefcase: M(WorkOutlineRounded),
};
