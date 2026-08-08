Set-StrictMode -Version Latest

function ConvertTo-CanonicalHostPathKey {
  [CmdletBinding()]
  param(
    [AllowEmptyString()]
    [string]$Path
  )

  if ([string]::IsNullOrWhiteSpace($Path)) {
    return ""
  }

  try {
    $isWindows = [System.Environment]::OSVersion.Platform -eq [System.PlatformID]::Win32NT
    if ($isWindows) {
      $isDriveAbsolute = $Path -match "^[A-Za-z]:[\\/]"
      $isUncAbsolute = $Path -match "^(?:\\\\|//)[^\\/]+[\\/][^\\/]+(?:[\\/]|$)"
      if (-not $isDriveAbsolute -and -not $isUncAbsolute) {
        return ""
      }
    } elseif (-not [System.IO.Path]::IsPathRooted($Path)) {
      return ""
    }
    $fullPath = [System.IO.Path]::GetFullPath($Path)
  } catch {
    return ""
  }

  $pathRoot = [System.IO.Path]::GetPathRoot($fullPath)
  if (-not [string]::IsNullOrEmpty($pathRoot) -and $fullPath.Length -le $pathRoot.Length) {
    return $fullPath
  }

  return $fullPath.TrimEnd(
    [System.IO.Path]::DirectorySeparatorChar,
    [System.IO.Path]::AltDirectorySeparatorChar
  )
}

function Test-CanonicalDockerProjectOwnership {
  [CmdletBinding()]
  param(
    [AllowEmptyString()]
    [string]$Project,
    [AllowEmptyString()]
    [string]$WorkingDirectory,
    [string[]]$AllowedProjects = @(),
    [string[]]$AllowedWorkingDirectories = @()
  )

  if (
    [string]::IsNullOrWhiteSpace($Project) -or
    -not ($AllowedProjects -icontains $Project)
  ) {
    return $false
  }

  $ownerPathKey = ConvertTo-CanonicalHostPathKey -Path $WorkingDirectory
  if ([string]::IsNullOrWhiteSpace($ownerPathKey)) {
    return $false
  }

  foreach ($allowedWorkingDirectory in $AllowedWorkingDirectories) {
    $allowedPathKey = ConvertTo-CanonicalHostPathKey -Path $allowedWorkingDirectory
    if (
      -not [string]::IsNullOrWhiteSpace($allowedPathKey) -and
      $allowedPathKey -ieq $ownerPathKey
    ) {
      return $true
    }
  }

  return $false
}

Export-ModuleMember -Function @(
  "ConvertTo-CanonicalHostPathKey",
  "Test-CanonicalDockerProjectOwnership"
)
