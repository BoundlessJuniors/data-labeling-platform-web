/**
 * Configuration for LabelGun Desktop downloads.
 * 
 * Desktop installers are published as GitHub Releases assets, not from
 * `frontend/public`. Keep options disabled until the corresponding release asset
 * exists and its URL has been verified.
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
  releaseBaseUrl: string;
  platforms: PlatformConfig[];
}

const version = "1.0.0";
const releaseBaseUrl = (import.meta.env.VITE_DESKTOP_RELEASE_BASE_URL || "").replace(/\/$/, "");
const githubReleaseAsset = (fileName: string): string | null =>
  releaseBaseUrl ? `${releaseBaseUrl}/${fileName}` : null;

export const downloadsConfig: DownloadsConfig = {
  appName: "LabelGun Desktop",
  currentVersion: version,
  releaseStatus: "LabelGun Desktop beta kurulum dosyaları hazırlanıyor. İlk yayın Windows x64 için GitHub Releases üzerinden paylaşılacak.",
  releaseBaseUrl,
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
          enabled: false,
          href: githubReleaseAsset(`LabelGun-Desktop-${version}-windows-x64-setup.exe`),
          badge: "Hazırlanıyor"
        },
        {
          id: "win-arm64",
          label: "Windows ARM64",
          enabled: false,
          href: githubReleaseAsset(`LabelGun-Desktop-${version}-windows-arm64-setup.exe`),
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
          id: "linux-appimage-x64",
          label: "AppImage x64",
          enabled: false,
          href: githubReleaseAsset(`LabelGun-Desktop-${version}-linux-x64.AppImage`),
          badge: "Yakında"
        },
        {
          id: "linux-appimage-arm64",
          label: "AppImage ARM64",
          enabled: false,
          href: githubReleaseAsset(`LabelGun-Desktop-${version}-linux-arm64.AppImage`),
          badge: "Yakında"
        },
        {
          id: "linux-deb-x64",
          label: "Debian/Ubuntu x64",
          enabled: false,
          href: githubReleaseAsset(`LabelGun-Desktop-${version}-linux-x64.deb`),
          badge: "Yakında"
        },
        {
          id: "linux-deb-arm64",
          label: "Debian/Ubuntu ARM64",
          enabled: false,
          href: githubReleaseAsset(`LabelGun-Desktop-${version}-linux-arm64.deb`),
          badge: "Yakında"
        }
      ]
    }
  ]
};
