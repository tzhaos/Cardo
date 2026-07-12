import AddOutlined from '@mui/icons-material/AddOutlined';
import AppsOutlined from '@mui/icons-material/AppsOutlined';
import BookmarkBorderOutlined from '@mui/icons-material/BookmarkBorderOutlined';
import BrushOutlined from '@mui/icons-material/BrushOutlined';
import CheckOutlined from '@mui/icons-material/CheckOutlined';
import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined';
import ChevronRightOutlined from '@mui/icons-material/ChevronRightOutlined';
import CloseOutlined from '@mui/icons-material/CloseOutlined';
import CodeOutlined from '@mui/icons-material/CodeOutlined';
import ContentCopyOutlined from '@mui/icons-material/ContentCopyOutlined';
import ContentPasteOutlined from '@mui/icons-material/ContentPasteOutlined';
import DarkModeOutlined from '@mui/icons-material/DarkModeOutlined';
import DeleteOutlineOutlined from '@mui/icons-material/DeleteOutlineOutlined';
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';
import DownloadOutlined from '@mui/icons-material/DownloadOutlined';
import DragIndicatorOutlined from '@mui/icons-material/DragIndicatorOutlined';
import EditOutlined from '@mui/icons-material/EditOutlined';
import ExpandMoreOutlined from '@mui/icons-material/ExpandMoreOutlined';
import FavoriteBorderOutlined from '@mui/icons-material/FavoriteBorderOutlined';
import FolderOutlined from '@mui/icons-material/FolderOutlined';
import GridViewOutlined from '@mui/icons-material/GridViewOutlined';
import HelpOutlineOutlined from '@mui/icons-material/HelpOutlineOutlined';
import HomeOutlined from '@mui/icons-material/HomeOutlined';
import ImageOutlined from '@mui/icons-material/ImageOutlined';
import Inventory2Outlined from '@mui/icons-material/Inventory2Outlined';
import LanguageOutlined from '@mui/icons-material/LanguageOutlined';
import LightModeOutlined from '@mui/icons-material/LightModeOutlined';
import LightbulbOutlined from '@mui/icons-material/LightbulbOutlined';
import LockOpenOutlined from '@mui/icons-material/LockOpenOutlined';
import LockOutlined from '@mui/icons-material/LockOutlined';
import MenuBookOutlined from '@mui/icons-material/MenuBookOutlined';
import MusicNoteOutlined from '@mui/icons-material/MusicNoteOutlined';
import MyLocationOutlined from '@mui/icons-material/MyLocationOutlined';
import OpenInNewOutlined from '@mui/icons-material/OpenInNewOutlined';
import PaletteOutlined from '@mui/icons-material/PaletteOutlined';
import PushPin from '@mui/icons-material/PushPin';
import PushPinOutlined from '@mui/icons-material/PushPinOutlined';
import RedoOutlined from '@mui/icons-material/RedoOutlined';
import RestartAltOutlined from '@mui/icons-material/RestartAltOutlined';
import SearchOutlined from '@mui/icons-material/SearchOutlined';
import SettingsOutlined from '@mui/icons-material/SettingsOutlined';
import StarBorderOutlined from '@mui/icons-material/StarBorderOutlined';
import StarOutlined from '@mui/icons-material/StarOutlined';
import StorageOutlined from '@mui/icons-material/StorageOutlined';
import TuneOutlined from '@mui/icons-material/TuneOutlined';
import UndoOutlined from '@mui/icons-material/UndoOutlined';
import UnfoldLessOutlined from '@mui/icons-material/UnfoldLessOutlined';
import UnfoldMoreOutlined from '@mui/icons-material/UnfoldMoreOutlined';
import UploadOutlined from '@mui/icons-material/UploadOutlined';
import ViewListOutlined from '@mui/icons-material/ViewListOutlined';
import WebAssetOutlined from '@mui/icons-material/WebAssetOutlined';
import WorkOutlineOutlined from '@mui/icons-material/WorkOutlineOutlined';
import { adaptSvgIcon, type ThemeIconPack } from '../types';

const M = (Icon: Parameters<typeof adaptSvgIcon>[0]) => adaptSvgIcon(Icon, 'mui');

/** Material / AI Studio — official Material Icons (Outlined). */
export const materialIconPack: ThemeIconPack = {
  settings: M(SettingsOutlined),
  search: M(SearchOutlined),
  add: M(AddOutlined),
  star: M(StarBorderOutlined),
  starOff: M(StarOutlined),
  trash: M(DeleteOutlineOutlined),
  home: M(HomeOutlined),
  box: M(Inventory2Outlined),
  folder: M(FolderOutlined),
  document: M(DescriptionOutlined),
  clipboard: M(ContentPasteOutlined),
  undo: M(UndoOutlined),
  redo: M(RedoOutlined),
  lock: M(LockOutlined),
  unlock: M(LockOpenOutlined),
  sun: M(LightModeOutlined),
  moon: M(DarkModeOutlined),
  check: M(CheckOutlined),
  close: M(CloseOutlined),
  chevronRight: M(ChevronRightOutlined),
  chevronDown: M(ExpandMoreOutlined),
  database: M(StorageOutlined),
  options: M(TuneOutlined),
  paintBrush: M(BrushOutlined),
  help: M(HelpOutlineOutlined),
  upload: M(UploadOutlined),
  download: M(DownloadOutlined),
  globe: M(LanguageOutlined),
  pin: M(PushPinOutlined),
  pinOff: M(PushPin),
  edit: M(EditOutlined),
  copy: M(ContentCopyOutlined),
  externalLink: M(OpenInNewOutlined),
  locate: M(MyLocationOutlined),
  image: M(ImageOutlined),
  apps: M(AppsOutlined),
  window: M(WebAssetOutlined),
  bookmark: M(BookmarkBorderOutlined),
  palette: M(PaletteOutlined),
  rotateCcw: M(RestartAltOutlined),
  fileDown: M(DownloadOutlined),
  fileUp: M(UploadOutlined),
  list: M(ViewListOutlined),
  layoutGrid: M(GridViewOutlined),
  collapse: M(UnfoldLessOutlined),
  expand: M(UnfoldMoreOutlined),
  grip: M(DragIndicatorOutlined),
  packageCheck: M(CheckCircleOutlined),
  panel: M(WebAssetOutlined),
  heart: M(FavoriteBorderOutlined),
  music: M(MusicNoteOutlined),
  book: M(MenuBookOutlined),
  idea: M(LightbulbOutlined),
  code: M(CodeOutlined),
  briefcase: M(WorkOutlineOutlined),
};
