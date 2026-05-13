/**
 * Configuration for LabelGun Desktop downloads.
 * 
 * Desktop installers are produced by `label_gun/electron-builder.yml` directly into
 * `frontend/public/downloads/`, so these hrefs must stay aligned with its artifact names.
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
  downloadsBasePath: string;
  platforms: PlatformConfig[];
}

const version = "1.0.0";
const downloadsBasePath = "/downloads";
const artifact = (fileName: string): string => `${downloadsBasePath}/${fileName}`;

export const downloadsConfig: DownloadsConfig = {
  appName: "LabelGun Desktop",
  currentVersion: version,
  releaseStatus: "LabelGun Desktop beta kurulum dosyaları Windows, macOS ve Linux için indirilebilir.",
  downloadsBasePath,
  platforms: [
    {
      id: "macos",
      name: "macOS",
      minimumRequirements: "macOS 12+",
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
          enabled: true,
          href: artifact(`LabelGun-Desktop-${version}-windows-x64-setup.exe`)
        },
        {
          id: "win-arm64",
          label: "Windows ARM64",
          enabled: true,
          href: artifact(`LabelGun-Desktop-${version}-windows-arm64-setup.exe`)
        }
      ]
    },
    {
      id: "linux",
      name: "Linux",
      minimumRequirements: "Ubuntu 20.04+, Debian 10+, Fedora 36+",
      options: [
        {
          id: "linux-appimage-x64",
          label: "AppImage x64",
          enabled: true,
          href: artifact(`LabelGun-Desktop-${version}-linux-x64.AppImage`)
        },
        {
          id: "linux-appimage-arm64",
          label: "AppImage ARM64",
          enabled: true,
          href: artifact(`LabelGun-Desktop-${version}-linux-arm64.AppImage`)
        },
        {
          id: "linux-deb-x64",
          label: "Debian/Ubuntu x64",
          enabled: true,
          href: artifact(`LabelGun-Desktop-${version}-linux-x64.deb`)
        },
        {
          id: "linux-deb-arm64",
          label: "Debian/Ubuntu ARM64",
          enabled: true,
          href: artifact(`LabelGun-Desktop-${version}-linux-arm64.deb`)
        }
      ]
    }
  ]
};
