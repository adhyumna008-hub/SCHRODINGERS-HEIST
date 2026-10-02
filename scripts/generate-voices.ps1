# Rebuild embedded narration using installed Windows voices. No network/service key.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$storyRoot = Split-Path $PSScriptRoot -Parent
$story = Get-Content -LiteralPath (Join-Path $storyRoot 'src/story/script.json') -Raw -Encoding utf8 | ConvertFrom-Json
$synth = [System.Speech.Synthesis.SpeechSynthesizer]::new()
$availableVoices = @($synth.GetInstalledVoices() | Where-Object Enabled | ForEach-Object { $_.VoiceInfo.Name })
$clips = [ordered]@{}
function Add-StoryClip($id, $text, $speaker) {
 if (-not $text) { return }
 $voice = switch ($speaker) { 'ADA' {'Microsoft Zira Desktop'} 'Lin' {'Microsoft Mark'} default {'Microsoft David Desktop'} }
 if ($voice -notin $availableVoices) { $voice = if ($speaker -eq 'ADA') {'Microsoft Zira Desktop'} else {'Microsoft David Desktop'} }
 $synth.SelectVoice($voice)
 $synth.Rate = if ($speaker -eq 'Unknown') {-2} else {0}
 $stream = [System.IO.MemoryStream]::new()
 $synth.SetOutputToWaveStream($stream)
 $synth.Speak($text)
 $synth.SetOutputToNull()
 $bytes = $stream.ToArray()
 $clips[$id] = @{src='data:audio/wav;base64,'+[Convert]::ToBase64String($bytes); speaker=$speaker}
 $stream.Dispose()
}
foreach ($shot in $story.opening) { Add-StoryClip ('intro-'+$shot.id) $shot.caption $shot.speaker }
foreach ($shot in $story.ending) { Add-StoryClip ('ending-'+$shot.id) $shot.caption $shot.speaker }
foreach ($level in $story.levels) {
 Add-StoryClip ('level-'+$level.number+'-brief') $level.brief $level.speaker
 Add-StoryClip ('level-'+$level.number+'-clear') $level.clear 'ADA'
}
$synth.Dispose()
$clips | ConvertTo-Json -Depth 4 -Compress | Set-Content -LiteralPath (Join-Path $storyRoot 'src/assets/voice-raw.json') -Encoding utf8
node (Join-Path $PSScriptRoot 'process-voices.mjs')
