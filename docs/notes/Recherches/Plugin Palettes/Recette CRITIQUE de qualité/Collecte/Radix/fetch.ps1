$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$sources = Join-Path $root 'sources'
$packages = Join-Path $sources 'packages'
$work = Join-Path $root '.fetch-work'
New-Item -ItemType Directory -Force -Path $packages, $work | Out-Null

$archives = @(
  @{ File = 'radix-ui-themes-3.3.0.tgz'; Url = 'https://registry.npmjs.org/@radix-ui/themes/-/themes-3.3.0.tgz'; Sha256 = '6275AB12EB6B35C56CE44B2F65786A8226642078584E6DD3A423766A327A992A'; Package = 'themes' },
  @{ File = 'radix-ui-colors-3.0.0.tgz'; Url = 'https://registry.npmjs.org/@radix-ui/colors/-/colors-3.0.0.tgz'; Sha256 = 'F6CEC1FF1FCC58A45EEEFC25D0E6AA1F1659845DBD198963617A86E43D21F3D1'; Package = 'colors' }
)
foreach ($archive in $archives) {
  $path = Join-Path $packages $archive.File
  Invoke-WebRequest -Uri $archive.Url -OutFile $path
  $actual = (Get-FileHash -Algorithm SHA256 $path).Hash
  if ($actual -ne $archive.Sha256) { throw "SHA-256 inattendue pour $($archive.File): $actual" }
  $destination = Join-Path $work $archive.Package
  New-Item -ItemType Directory -Force -Path $destination | Out-Null
  tar -xf $path -C $destination
}

$themes = Join-Path $work 'themes/package'
$colors = Join-Path $work 'colors/package'
$themeOutput = Join-Path $sources 'themes'
$colorOutput = Join-Path $sources 'colors'
New-Item -ItemType Directory -Force -Path $themeOutput, $colorOutput | Out-Null
Copy-Item (Join-Path $themes 'components.css') (Join-Path $themeOutput 'components.css.txt')
Copy-Item (Join-Path $themes 'tokens/base.css') (Join-Path $themeOutput 'base.css.txt')
Copy-Item (Join-Path $themes 'tokens/colors/gray.css') (Join-Path $themeOutput 'gray.css.txt')
Copy-Item (Join-Path $themes 'LICENSE') (Join-Path $themeOutput 'LICENSE.txt')
Copy-Item (Join-Path $colors 'LICENSE') (Join-Path $colorOutput 'LICENSE.txt')
foreach ($name in @('blue', 'green', 'amber', 'red')) {
  Copy-Item (Join-Path $themes "tokens/colors/$name.css") (Join-Path $themeOutput "$name.css.txt")
  foreach ($suffix in @('', '-dark', '-alpha', '-dark-alpha')) {
    Copy-Item (Join-Path $colors "$name$suffix.css") (Join-Path $colorOutput "$name$suffix.css.txt")
  }
}
Remove-Item -Recurse -Force $work
