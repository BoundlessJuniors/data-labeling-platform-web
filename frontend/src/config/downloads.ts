/**
 * Configuration for DataLabel Desktop downloads.
 * 
 * Later installer files can be placed under `public/downloads/`.
 * Once ready:
 * 1. Change `enabled: true`
 * 2. Set `href: '/downloads/<filename>'`
 * 3. Remove or change `badge` string
 */

export interface DownloadOption {
  id: string;
  label: string;
  enabled: boolean;
  href: string | null;
  badge?: string;
}

export interface PlatformConfig {
  id: string;
  name: string;
  minimumRequirements: string;
  options: DownloadOption[];
}

export interface DownloadsConfig {
  appName: string;
  currentVersion: string;
  releaseStatus: string;
  platforms: PlatformConfig[];
}

export const downloadsConfig: DownloadsConfig = {
  appName: "LabelGun Desktop",
  currentVersion: "Beta",
  releaseStatus: "LabelGun Desktop kurulum dosyaları henüz beta dağıtıma açılmadı.",
  platforms: [
    {
      id: "macos",
      name: "macOS",
      minimumRequirements: "macOS 12+ (Önerilen)",
      options: [
        {
          id: "mac-apple-silicon",
          label: "Apple Silicon",
          enabled: false,
          href: null,
          badge: "Yakında"
        },
        {
          id: "mac-intel",
          label: "Intel",
          enabled: false,
          href: null,
          badge: "Yakında"
        }
      ]
    },
    {
      id: "windows",
      name: "Windows",
      minimumRequirements: "Windows 10/11 64-bit",
      options: [
        {
          id: "win-x64",
          label: "Windows x64",
          enabled: false,
          href: null,
          badge: "Yakında"
        },
        {
          id: "win-arm64",
          label: "Windows ARM64",
          enabled: false,
          href: null,
          badge: "Yakında"
        }
      ]
    },
    {
      id: "linux",
      name: "Linux",
      minimumRequirements: "Ubuntu 20.04+, Debian 10+, Fedora 36+",
      options: [
        {
          id: "linux-appimage",
          label: "AppImage x64",
          enabled: false,
          href: null,
          badge: "Yakında"
        }
      ]
    }
  ]
};
