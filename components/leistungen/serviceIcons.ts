import {
  Bot,
  Calculator,
  CalendarPlus,
  Camera,
  DoorOpen,
  Eye,
  FileSearch,
  FileStack,
  FolderCheck,
  Globe,
  Handshake,
  Headset,
  Leaf,
  Map,
  PencilRuler,
  Ruler,
  Scale,
  ScrollText,
  Send,
  Share2,
  ShieldCheck,
  Sofa,
  Stamp,
  TrendingUp,
  WandSparkles,
  type LucideIcon,
} from "lucide-react";

/** Inline-SVG-Icon je Leistung, im bestehenden Stil (Lucide, Strichstärke 1.5) */
export const SERVICE_ICONS: Record<string, LucideIcon> = {
  "unterlagen-komplett": FolderCheck,
  grundbuchauszug: ScrollText,
  flurkarte: Map,
  baulastenauskunft: FileSearch,
  teilungserklaerung: FileStack,
  grundrisse: PencilRuler,
  energieausweis: Leaf,
  wohnflaechenberechnung: Ruler,
  verkehrswertgutachten: Scale,
  renditeuebersicht: Calculator,
  "web-expose": Globe,
  fotografie: Camera,
  rundgang: Eye,
  homestaging: Sofa,
  /* WandSparkles statt Camera oder Image: Die drei Foto-Leistungen
     muessen sich am Zeichen unterscheiden lassen. Die Kamera steht
     fuer den Menschen, der vorbeikommt, das Sofa fuer die virtuelle
     Moeblierung, und der Zauberstab fuer die Maschine, die vorhandene
     Aufnahmen verbessert. */
  "foto-aufbereitung": WandSparkles,
  "social-media": Share2,
  "portal-schaltung": Send,
  "laufzeit-verlaengerung": CalendarPlus,
  "ki-anfragenmanagement": Bot,
  bonitaetscheck: ShieldCheck,
  // Bewusst KEIN Hammer: Das Bieterverfahren ist keine Versteigerung,
  // und ein Auktionshammer würde genau das nahelegen. Die steigende
  // Linie trifft es: Start unter Wert, Gebote kommen darüber herein.
  bieterverfahren: TrendingUp,
  "besichtigungs-service": DoorOpen,
  "verhandlungs-begleitung": Handshake,
  "notar-koordination": Stamp,
  ansprechpartner: Headset,
};
