#ifndef BuildNumber
  #define BuildNumber "0"
#endif

[Setup]
AppId={{F58E5F24-EEDE-44B8-A2AB-EDB867CB384E}
AppName=Multi Live Chat
AppVersion=0.2.0.{#BuildNumber}
AppPublisher=@CrafOps
AppPublisherURL=https://github.com/PPekKunGzDev/-OBS-Plugin-MultiChat
DefaultDirName={localappdata}\MultiLiveChat
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
OutputDir=..\build\release
OutputBaseFilename=Multi-Live-Chat-Setup
Compression=lzma2/fast
SolidCompression=yes
WizardStyle=modern
UninstallDisplayName=Multi Live Chat by @CrafOps
SetupIconFile=..\assets\appicon.ico
UninstallDisplayIcon={app}\appicon.ico
CloseApplications=yes
RestartApplications=no
SetupLogging=yes

[Files]
Source: "..\package\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\package\obs-plugins\64bit\obs-unified-chat.dll"; DestDir: "{code:ObsRoot}\obs-plugins\64bit"; Flags: ignoreversion
Source: "..\package\data\*"; DestDir: "{code:ObsRoot}\data"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\package\bin\*"; DestDir: "{code:ObsRoot}\bin"; Flags: ignoreversion recursesubdirs createallsubdirs uninsneveruninstall

[Registry]
Root: HKCU; Subkey: "Software\OBSUnifiedChat\NativeDock"; ValueType: string; ValueName: "bridgeRoot"; ValueData: "{app}"
Root: HKCU; Subkey: "Software\OBSUnifiedChat\NativeDock"; ValueType: string; ValueName: "nodePath"; ValueData: "{app}\runtime\node.exe"
Root: HKCU; Subkey: "Software\OBSUnifiedChat\NativeDock"; ValueType: dword; ValueName: "startWithObs"; ValueData: "1"
Root: HKCU; Subkey: "Software\OBSUnifiedChat\NativeDock"; ValueType: dword; ValueName: "autoUpdate"; ValueData: "1"
Root: HKCU; Subkey: "Software\CrafOps\MultiLiveChat"; ValueType: string; ValueName: "ObsRoot"; ValueData: "{code:ObsRoot}"

[Code]
var
  ObsPage: TInputDirWizardPage;
  UpdateLock: TFileStream;
  UpdateFolder: String;

function StopUpdater(Folder: String): Boolean;
var
  Attempt: Integer;
begin
  Result := False;
  UpdateFolder := Folder;
  ForceDirectories(Folder);
  if not SaveStringToFile(Folder + '\.update-disabled', 'setup', False) then
    Exit;
  if Assigned(UpdateLock) then
  begin
    Result := True;
    Exit;
  end;
  if not FileExists(Folder + '\.update.lock') then
  begin
    Result := True;
    Exit;
  end;
  for Attempt := 1 to 60 do
  begin
    try
      UpdateLock := TFileStream.Create(Folder + '\.update.lock', fmOpenReadWrite or fmShareExclusive);
      Result := True;
      Exit;
    except
      Sleep(500);
    end;
  end;
end;

procedure ReleaseUpdater;
begin
  if Assigned(UpdateLock) then
  begin
    UpdateLock.Free;
    UpdateLock := nil;
  end;
  if UpdateFolder <> '' then
    DeleteFile(UpdateFolder + '\.update-disabled');
end;

function ObsRoot(Param: String): String;
begin
  Result := RemoveBackslashUnlessRoot(ObsPage.Values[0]);
end;

function DetectObs: String;
var
  SteamPath: String;
  Saved: String;
begin
  Result := ExpandConstant('{commonpf64}\obs-studio');
  if RegQueryStringValue(HKCU, 'Software\CrafOps\MultiLiveChat', 'ObsRoot', Saved) then
    if FileExists(Saved + '\bin\64bit\obs64.exe') then
      Result := Saved;
  if not FileExists(Result + '\bin\64bit\obs64.exe') then
    if RegQueryStringValue(HKCU, 'Software\Valve\Steam', 'SteamPath', SteamPath) then
      if FileExists(SteamPath + '\steamapps\common\OBS Studio\bin\64bit\obs64.exe') then
        Result := SteamPath + '\steamapps\common\OBS Studio';
  Result := ExpandConstant('{param:OBSROOT|' + Result + '}');
end;

procedure InitializeWizard;
begin
  ObsPage := CreateInputDirPage(wpSelectDir, 'Choose your OBS installation',
    'Where is OBS Studio installed?',
    'Select the OBS folder containing bin\64bit\obs64.exe. Close OBS before installing. This build supports OBS 32.2.2 with Qt 6.11.1.', False, '');
  ObsPage.Add('OBS Studio folder:');
  ObsPage.Values[0] := DetectObs;
end;

function ValidateObs: String;
var
  Root: String;
  VersionMS: Cardinal;
  VersionLS: Cardinal;
  Probe: String;
begin
  Result := '';
  Root := ObsRoot('');
  if not FileExists(Root + '\bin\64bit\obs64.exe') then
  begin
    Result := 'OBS was not found in this folder. Choose the OBS Studio installation folder.';
    Exit;
  end;
  if not GetVersionNumbers(Root + '\bin\64bit\Qt6Core.dll', VersionMS, VersionLS) then
  begin
    Result := 'Could not check the OBS Qt runtime. Select a complete OBS installation.';
    Exit;
  end;
  if (VersionMS <> ((6 shl 16) or 11)) or ((VersionLS shr 16) <> 1) then
  begin
    Result := 'This installer requires OBS with Qt 6.11.1. No plugin files were installed.';
    Exit;
  end;
  if not GetVersionNumbers(Root + '\bin\64bit\obs64.exe', VersionMS, VersionLS) then
  begin
    Result := 'Could not check the OBS version.';
    Exit;
  end;
  if (VersionMS <> ((32 shl 16) or 2)) or ((VersionLS shr 16) <> 2) then
  begin
    Result := 'This installer supports OBS 32.2.2. No plugin files were installed.';
    Exit;
  end;
  Probe := Root + '\.multilivechat-install-check';
  if not SaveStringToFile(Probe, 'write-check', False) then
  begin
    Result := 'Windows does not allow writing to this OBS folder. Run Setup as administrator or choose a writable OBS installation. Automatic updates also need write access.';
    Exit;
  end;
  DeleteFile(Probe);
end;

function NextButtonClick(CurPageID: Integer): Boolean;
var
  Error: String;
begin
  Result := True;
  if CurPageID = ObsPage.ID then
  begin
    Error := ValidateObs;
    if Error <> '' then
    begin
      MsgBox(Error, mbError, MB_OK);
      Result := False;
    end;
  end;
end;

function PrepareToInstall(var NeedsRestart: Boolean): String;
var
  Stream: TFileStream;
begin
  Result := ValidateObs;
  if Result <> '' then
    Exit;
  if FileExists(ObsRoot('') + '\obs-plugins\64bit\obs-unified-chat.dll') then
  begin
    try
      Stream := TFileStream.Create(ObsRoot('') + '\obs-plugins\64bit\obs-unified-chat.dll', fmOpenReadWrite or fmShareExclusive);
      Stream.Free;
    except
      Result := 'Close OBS completely before installing Multi Live Chat.';
    end;
  end;
  if (Result = '') and not StopUpdater(WizardDirValue) then
    Result := 'An automatic update is still finishing. Wait a moment, then try installation again.';
end;

procedure DeinitializeSetup;
begin
  ReleaseUpdater;
end;

function InitializeUninstall: Boolean;
begin
  Result := StopUpdater(ExpandConstant('{app}'));
  if not Result then
  begin
    ReleaseUpdater;
    MsgBox('Close OBS and wait for its automatic update to finish, then uninstall again.', mbError, MB_OK);
  end;
end;

procedure DeinitializeUninstall;
begin
  ReleaseUpdater;
  DeleteFile(ExpandConstant('{app}\.update.lock'));
  DeleteFile(ExpandConstant('{app}\.update-status.txt'));
end;
