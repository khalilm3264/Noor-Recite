import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { User } from 'firebase/auth';
import {
  ArchiveRestore,
  Check,
  CheckCircle2,
  Clock,
  Download,
  Edit3,
  Eye,
  FileAudio,
  FileCode2,
  FileImage,
  FilePlus2,
  FileText,
  Folder,
  FolderOpen,
  HardDrive,
  LogOut,
  RefreshCw,
  RotateCcw,
  Search,
  Star,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  buildStudyJournalMarkdown,
  createDriveMultipartFile,
  deleteDriveFilePermanently,
  downloadDriveFileBlob,
  DriveAboutInfo,
  DriveActivityEntry,
  DriveAuthExpiredError,
  DriveFileItem,
  DriveFilePreviewResult,
  DriveListScope,
  fetchDriveAbout,
  fetchDriveFileActivity,
  findNoorFolder,
  findOrCreateNoorFolder,
  formatDriveBytes,
  GOOGLE_DOC_MIME,
  GOOGLE_FOLDER_MIME,
  listDriveFiles,
  listNoorBackupFiles,
  NOOR_DRIVE_FOLDER_NAME,
  NoorDriveBackupPayload,
  overwriteDriveMultipartFile,
  parseNoorBackupJson,
  readDriveFilePreview,
  updateDriveFileMetadata,
} from '../utils/googleDriveApi';
import { DriveConfirmDialogState, DriveConfirmModal } from './DriveConfirmModal';
import { GoogleSignInButton } from './GoogleSignInButton';

interface GoogleDriveViewProps {
  user: User | null;
  accessToken: string | null;
  needsAuth: boolean;
  isSigningIn: boolean;
  authError: string | null;
  onSignIn: () => void;
  onSignOut: () => void;
  onTokenExpired: () => void;
  backupPayload: NoorDriveBackupPayload;
  onRestoreBackup: (payload: NoorDriveBackupPayload) => void;
}

type DriveHubTab = 'backup' | 'files';

const SCOPE_OPTIONS: { id: DriveListScope; label: string }[] = [
  { id: 'noor-folder', label: 'Noor Study Folder' },
  { id: 'all', label: 'All My Drive' },
  { id: 'docs', label: 'Docs & Notes' },
  { id: 'media', label: 'PDFs & Audio' },
  { id: 'appdata', label: 'App Data' },
  { id: 'trashed', label: 'Trash' },
];

export const GoogleDriveView: React.FC<GoogleDriveViewProps> = ({
  user,
  accessToken,
  needsAuth,
  isSigningIn,
  authError,
  onSignIn,
  onSignOut,
  onTokenExpired,
  backupPayload,
  onRestoreBackup,
}) => {
  const [activeTab, setActiveTab] = useState<DriveHubTab>('backup');
  const [aboutInfo, setAboutInfo] = useState<DriveAboutInfo | null>(null);
  const [noorFolder, setNoorFolder] = useState<DriveFileItem | null>(null);
  const [backupFiles, setBackupFiles] = useState<DriveFileItem[]>([]);
  const [driveFiles, setDriveFiles] = useState<DriveFileItem[]>([]);
  const [listScope, setListScope] = useState<DriveListScope>('noor-folder');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());

  const [isLoadingDrive, setIsLoadingDrive] = useState(false);
  const [isActionBusy, setIsActionBusy] = useState(false);
  const [statusBanner, setStatusBanner] = useState<{
    tone: 'success' | 'error';
    message: string;
  } | null>(null);

  const [confirmDialog, setConfirmDialog] = useState<DriveConfirmDialogState | null>(null);

  // Rename state
  const [renamingFileId, setRenamingFileId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');

  // Compose New Study Note state
  const [showNewNoteForm, setShowNewNoteForm] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteBody, setNewNoteBody] = useState('');
  const [newNoteAsGoogleDoc, setNewNoteAsGoogleDoc] = useState(true);

  // Preview drawer state
  const [previewTarget, setPreviewTarget] = useState<DriveFileItem | null>(null);
  const [previewResult, setPreviewResult] = useState<DriveFilePreviewResult | null>(null);
  const [previewActivity, setPreviewActivity] = useState<DriveActivityEntry[]>([]);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const previewObjectUrlRef = useRef<string | null>(null);

  const clearPreviewObjectUrl = useCallback(() => {
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
      previewObjectUrlRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearPreviewObjectUrl();
    };
  }, [clearPreviewObjectUrl]);

  const handleDriveError = useCallback(
    (err: unknown, fallbackMsg: string) => {
      if (err instanceof DriveAuthExpiredError) {
        onTokenExpired();
        setStatusBanner({
          tone: 'error',
          message: err.message,
        });
        return;
      }
      const message = err instanceof Error ? err.message : fallbackMsg;
      setStatusBanner({
        tone: 'error',
        message: message || fallbackMsg,
      });
    },
    [onTokenExpired]
  );

  const refreshDriveData = useCallback(
    async (scopeOverride?: DriveListScope, queryOverride?: string) => {
      if (!accessToken) return;
      const targetScope = scopeOverride ?? listScope;
      const targetQuery = queryOverride ?? searchQuery;
      setIsLoadingDrive(true);
      try {
        const [about, folder] = await Promise.all([
          fetchDriveAbout(accessToken),
          findNoorFolder(accessToken),
        ]);
        setAboutInfo(about);
        setNoorFolder(folder);

        const [backups, files] = await Promise.all([
          listNoorBackupFiles(accessToken, folder?.id),
          targetScope === 'noor-folder' && !folder
            ? Promise.resolve([] as DriveFileItem[])
            : listDriveFiles(accessToken, {
                scope: targetScope,
                searchQuery: targetQuery,
                noorFolderId: folder?.id,
              }),
        ]);
        setBackupFiles(backups);
        setDriveFiles(files);
        setSelectedFileIds(new Set());
      } catch (err) {
        handleDriveError(err, 'Unable to load Google Drive files.');
      } finally {
        setIsLoadingDrive(false);
      }
    },
    [accessToken, handleDriveError, listScope, searchQuery]
  );

  useEffect(() => {
    if (accessToken && !needsAuth) {
      void refreshDriveData();
    } else {
      setAboutInfo(null);
      setBackupFiles([]);
      setDriveFiles([]);
      setSelectedFileIds(new Set());
    }
  }, [accessToken, needsAuth, refreshDriveData]);

  const storageSummary = useMemo(() => {
    const usage = Number(aboutInfo?.storageQuota?.usage ?? 0);
    const limit = Number(aboutInfo?.storageQuota?.limit ?? 0);
    if (!Number.isFinite(usage) || !Number.isFinite(limit) || limit <= 0) {
      return null;
    }
    const pct = Math.min(100, Math.max(1, Math.round((usage / limit) * 100)));
    return {
      usageLabel: formatDriveBytes(String(usage)),
      limitLabel: formatDriveBytes(String(limit)),
      pct,
    };
  }, [aboutInfo]);

  const executeConfirmedAction = async (fn: () => Promise<void>) => {
    setIsActionBusy(true);
    try {
      await fn();
      setConfirmDialog(null);
    } catch (err) {
      setConfirmDialog(null);
      handleDriveError(err, 'Google Drive operation failed.');
    } finally {
      setIsActionBusy(false);
    }
  };

  const handleSaveNewBackup = () => {
    if (!accessToken) return;
    const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
    const fileName = `noor-recite-backup-${stamp}.json`;

    setConfirmDialog({
      title: 'Save Study Backup to Google Drive?',
      description: `This will create "${fileName}" inside your "${NOOR_DRIVE_FOLDER_NAME}" folder in Google Drive containing your bookmarks, notes, Hifz progress, Khatmah plan, and preferences.`,
      items: [
        `${backupPayload.bookmarks.length} saved verses & contemplation notes`,
        `${backupPayload.bookmarkCollections.length} collections`,
        `${backupPayload.hifzSpacedQueue.length} Hifz spaced-review verses`,
        `${backupPayload.recitationHistory.length} recitation log entries`,
      ],
      confirmLabel: 'Save Backup to Drive',
      tone: 'primary',
      onConfirm: () =>
        executeConfirmedAction(async () => {
          const folder = await findOrCreateNoorFolder(accessToken);
          setNoorFolder(folder);
          const payloadWithEmail: NoorDriveBackupPayload = {
            ...backupPayload,
            accountEmail: aboutInfo?.user?.emailAddress || user?.email || undefined,
            exportedAt: new Date().toISOString(),
          };
          await createDriveMultipartFile(
            accessToken,
            {
              name: fileName,
              mimeType: 'application/json',
              parents: [folder.id],
              description: 'Noor Recite study backup snapshot',
            },
            JSON.stringify(payloadWithEmail, null, 2),
            'application/json'
          );
          setStatusBanner({
            tone: 'success',
            message: `Saved "${fileName}" to your "${NOOR_DRIVE_FOLDER_NAME}" folder in Google Drive.`,
          });
          await refreshDriveData();
        }),
    });
  };

  const handleOverwriteBackup = (file: DriveFileItem) => {
    if (!accessToken) return;
    setConfirmDialog({
      title: 'Overwrite Existing Drive Backup?',
      description: `You are about to replace the contents of "${file.name}" in Google Drive with your current local Noor Recite study data. The previous version in that file will be overwritten.`,
      items: [
        `Target file: ${file.name}`,
        file.modifiedTime
          ? `Last modified: ${new Date(file.modifiedTime).toLocaleString()}`
          : 'Existing Drive backup',
      ],
      confirmLabel: 'Overwrite Backup',
      tone: 'amber',
      onConfirm: () =>
        executeConfirmedAction(async () => {
          const payloadWithEmail: NoorDriveBackupPayload = {
            ...backupPayload,
            accountEmail: aboutInfo?.user?.emailAddress || user?.email || undefined,
            exportedAt: new Date().toISOString(),
          };
          await overwriteDriveMultipartFile(
            accessToken,
            file.id,
            {
              name: file.name,
              description: `Updated ${new Date().toLocaleDateString()} from Noor Recite`,
            },
            JSON.stringify(payloadWithEmail, null, 2),
            'application/json'
          );
          setStatusBanner({
            tone: 'success',
            message: `Updated "${file.name}" with your latest Noor Recite study snapshot.`,
          });
          await refreshDriveData();
        }),
    });
  };

  const handleRestoreFromDriveFile = async (file: DriveFileItem) => {
    if (!accessToken) return;
    setIsActionBusy(true);
    try {
      const preview = await readDriveFilePreview(accessToken, file);
      const parsed = preview.textContent ? parseNoorBackupJson(preview.textContent) : null;
      if (!parsed) {
        setStatusBanner({
          tone: 'error',
          message: `"${file.name}" is not a recognized Noor Recite backup JSON file.`,
        });
        return;
      }

      setConfirmDialog({
        title: 'Restore Study Data from Google Drive?',
        description: `Restoring "${file.name}" will replace your current local bookmarks, collections, Hifz review queue, Khatmah plan, recitation history, and reader preferences with the snapshot saved on ${new Date(parsed.exportedAt).toLocaleString()}.`,
        items: [
          `${parsed.bookmarks.length} bookmarked verses & notes`,
          `${parsed.bookmarkCollections?.length ?? 0} collections`,
          `${parsed.hifzSpacedQueue?.length ?? 0} Hifz spaced-review items`,
          `Khatmah Day ${parsed.khatmahPlan?.currentDay ?? 1} (${parsed.khatmahPlan?.pagesCompleted ?? 0} pages)`,
          `${parsed.recitationHistory?.length ?? 0} recitation history entries`,
        ],
        confirmLabel: 'Restore Snapshot',
        tone: 'amber',
        onConfirm: async () => {
          onRestoreBackup(parsed);
          setConfirmDialog(null);
          setStatusBanner({
            tone: 'success',
            message: `Restored Noor Recite study data from "${file.name}".`,
          });
        },
      });
    } catch (err) {
      handleDriveError(err, `Failed to read "${file.name}" from Google Drive.`);
    } finally {
      setIsActionBusy(false);
    }
  };

  const handleExportJournalAsGoogleDoc = () => {
    if (!accessToken) return;
    const stamp = new Date().toISOString().slice(0, 10);
    const docName = `Noor Recite Study Journal (${stamp})`;
    const markdown = buildStudyJournalMarkdown(backupPayload);

    setConfirmDialog({
      title: 'Export Study Journal to Google Docs?',
      description: `This creates a readable Google Doc titled "${docName}" inside your "${NOOR_DRIVE_FOLDER_NAME}" folder containing your saved verses, translations, contemplation notes, and Hifz list.`,
      items: [
        `${backupPayload.bookmarks.length} saved verses & notes`,
        `${backupPayload.hifzSpacedQueue.length} Hifz queue items`,
        `${backupPayload.hifzWeakWords.length} focused Tajweed words`,
      ],
      confirmLabel: 'Create Google Doc',
      tone: 'primary',
      onConfirm: () =>
        executeConfirmedAction(async () => {
          const folder = await findOrCreateNoorFolder(accessToken);
          setNoorFolder(folder);
          await createDriveMultipartFile(
            accessToken,
            {
              name: docName,
              mimeType: GOOGLE_DOC_MIME,
              parents: [folder.id],
              description: 'Exported Quranic study notes and bookmarks from Noor Recite',
            },
            markdown,
            'text/markdown'
          );
          setStatusBanner({
            tone: 'success',
            message: `Created Google Doc "${docName}" in your "${NOOR_DRIVE_FOLDER_NAME}" folder.`,
          });
          await refreshDriveData();
        }),
    });
  };

  const handleUploadLocalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !accessToken) return;

    setConfirmDialog({
      title: 'Upload File to Google Drive?',
      description: `Upload "${file.name}" (${formatDriveBytes(String(file.size))}) into your "${NOOR_DRIVE_FOLDER_NAME}" folder in Google Drive?`,
      items: [file.name],
      confirmLabel: 'Upload File',
      tone: 'primary',
      onConfirm: () =>
        executeConfirmedAction(async () => {
          const folder = await findOrCreateNoorFolder(accessToken);
          setNoorFolder(folder);
          await createDriveMultipartFile(
            accessToken,
            {
              name: file.name,
              parents: [folder.id],
              description: 'Uploaded from Noor Recite Study Hub',
            },
            file,
            file.type || 'application/octet-stream'
          );
          setStatusBanner({
            tone: 'success',
            message: `Uploaded "${file.name}" to Google Drive.`,
          });
          await refreshDriveData();
        }),
    });
  };

  const handleCreateNewNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !newNoteTitle.trim() || !newNoteBody.trim()) return;
    const trimmedTitle = newNoteTitle.trim();
    const targetName = newNoteAsGoogleDoc
      ? trimmedTitle
      : trimmedTitle.endsWith('.md')
      ? trimmedTitle
      : `${trimmedTitle}.md`;

    setConfirmDialog({
      title: newNoteAsGoogleDoc
        ? 'Create Study Note in Google Docs?'
        : 'Save Study Note to Google Drive?',
      description: `Save "${targetName}" into your "${NOOR_DRIVE_FOLDER_NAME}" folder in Google Drive?`,
      items: [targetName],
      confirmLabel: 'Save Study Note',
      tone: 'primary',
      onConfirm: () =>
        executeConfirmedAction(async () => {
          const folder = await findOrCreateNoorFolder(accessToken);
          setNoorFolder(folder);
          await createDriveMultipartFile(
            accessToken,
            {
              name: targetName,
              mimeType: newNoteAsGoogleDoc ? GOOGLE_DOC_MIME : 'text/markdown',
              parents: [folder.id],
              description: 'Quranic study note created in Noor Recite',
            },
            `# ${trimmedTitle}\n\n${newNoteBody.trim()}\n`,
            'text/markdown'
          );
          setNewNoteTitle('');
          setNewNoteBody('');
          setShowNewNoteForm(false);
          setStatusBanner({
            tone: 'success',
            message: `Saved "${targetName}" to Google Drive.`,
          });
          await refreshDriveData();
        }),
    });
  };

  const handleConfirmRename = (file: DriveFileItem) => {
    if (!accessToken) return;
    const nextName = renameDraft.trim();
    if (!nextName || nextName === file.name) {
      setRenamingFileId(null);
      return;
    }

    setConfirmDialog({
      title: 'Rename File in Google Drive?',
      description: `Rename this Google Drive item from "${file.name}" to "${nextName}"?`,
      items: [`Current: ${file.name}`, `New: ${nextName}`],
      confirmLabel: 'Confirm Rename',
      tone: 'amber',
      onConfirm: () =>
        executeConfirmedAction(async () => {
          await updateDriveFileMetadata(accessToken, file.id, { name: nextName });
          setRenamingFileId(null);
          setStatusBanner({
            tone: 'success',
            message: `Renamed "${file.name}" to "${nextName}".`,
          });
          await refreshDriveData();
        }),
    });
  };

  const handleToggleStar = (file: DriveFileItem) => {
    if (!accessToken) return;
    const nextStarred = !file.starred;
    setConfirmDialog({
      title: nextStarred ? 'Star File in Google Drive?' : 'Remove Star from File?',
      description: nextStarred
        ? `Mark "${file.name}" as starred in your Google Drive?`
        : `Remove star from "${file.name}" in your Google Drive?`,
      items: [file.name],
      confirmLabel: nextStarred ? 'Star File' : 'Remove Star',
      tone: 'primary',
      onConfirm: () =>
        executeConfirmedAction(async () => {
          await updateDriveFileMetadata(accessToken, file.id, { starred: nextStarred });
          setStatusBanner({
            tone: 'success',
            message: nextStarred
              ? `Starred "${file.name}".`
              : `Removed star from "${file.name}".`,
          });
          await refreshDriveData();
        }),
    });
  };

  const handleTrashOrRestoreFile = (file: DriveFileItem, trashed: boolean) => {
    if (!accessToken) return;
    setConfirmDialog({
      title: trashed ? 'Move File to Google Drive Trash?' : 'Restore File from Trash?',
      description: trashed
        ? `Move "${file.name}" to Google Drive Trash? You can still restore it later from Trash.`
        : `Restore "${file.name}" from Google Drive Trash back to your Drive?`,
      items: [file.name],
      confirmLabel: trashed ? 'Move to Trash' : 'Restore File',
      tone: trashed ? 'amber' : 'primary',
      onConfirm: () =>
        executeConfirmedAction(async () => {
          await updateDriveFileMetadata(accessToken, file.id, { trashed });
          if (previewTarget?.id === file.id) {
            clearPreviewObjectUrl();
            setPreviewTarget(null);
            setPreviewResult(null);
          }
          setStatusBanner({
            tone: 'success',
            message: trashed
              ? `Moved "${file.name}" to Trash.`
              : `Restored "${file.name}" from Trash.`,
          });
          await refreshDriveData();
        }),
    });
  };

  const handleDeletePermanently = (filesToDelete: DriveFileItem[]) => {
    if (!accessToken || filesToDelete.length === 0) return;
    const isSingle = filesToDelete.length === 1;
    setConfirmDialog({
      title: isSingle
        ? 'Permanently Delete File from Google Drive?'
        : `Permanently Delete ${filesToDelete.length} Files from Google Drive?`,
      description:
        'This action permanently deletes the selected item(s) from Google Drive and bypasses Trash. This cannot be undone.',
      items: filesToDelete.map((f) => f.name),
      confirmLabel: isSingle ? 'Delete Permanently' : `Delete ${filesToDelete.length} Files`,
      tone: 'danger',
      onConfirm: () =>
        executeConfirmedAction(async () => {
          for (const f of filesToDelete) {
            await deleteDriveFilePermanently(accessToken, f.id);
          }
          if (previewTarget && filesToDelete.some((f) => f.id === previewTarget.id)) {
            clearPreviewObjectUrl();
            setPreviewTarget(null);
            setPreviewResult(null);
          }
          setStatusBanner({
            tone: 'success',
            message: isSingle
              ? `Permanently deleted "${filesToDelete[0].name}".`
              : `Permanently deleted ${filesToDelete.length} files from Google Drive.`,
          });
          await refreshDriveData();
        }),
    });
  };

  const handleBulkTrash = (filesToTrash: DriveFileItem[]) => {
    if (!accessToken || filesToTrash.length === 0) return;
    setConfirmDialog({
      title: `Move ${filesToTrash.length} Selected File(s) to Trash?`,
      description:
        'The selected items will be moved to Google Drive Trash. You can restore them from the Trash view if needed.',
      items: filesToTrash.map((f) => f.name),
      confirmLabel: `Trash ${filesToTrash.length} File(s)`,
      tone: 'amber',
      onConfirm: () =>
        executeConfirmedAction(async () => {
          for (const f of filesToTrash) {
            await updateDriveFileMetadata(accessToken, f.id, { trashed: true });
          }
          setStatusBanner({
            tone: 'success',
            message: `Moved ${filesToTrash.length} file(s) to Trash.`,
          });
          await refreshDriveData();
        }),
    });
  };

  const handleOpenPreview = async (file: DriveFileItem) => {
    if (!accessToken) return;
    clearPreviewObjectUrl();
    setPreviewTarget(file);
    setPreviewResult(null);
    setPreviewActivity([]);
    setIsLoadingPreview(true);
    try {
      const [result, activity] = await Promise.all([
        readDriveFilePreview(accessToken, file),
        fetchDriveFileActivity(accessToken, file.id),
      ]);
      if (result.objectUrl) {
        previewObjectUrlRef.current = result.objectUrl;
      }
      setPreviewResult(result);
      setPreviewActivity(activity);
    } catch (err) {
      handleDriveError(err, `Unable to preview "${file.name}".`);
      setPreviewTarget(null);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleDownloadFile = async (file: DriveFileItem) => {
    if (!accessToken) return;
    setIsActionBusy(true);
    try {
      const { blob, downloadName } = await downloadDriveFileBlob(accessToken, file);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = downloadName;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatusBanner({
        tone: 'success',
        message: `Downloaded "${downloadName}".`,
      });
    } catch (err) {
      handleDriveError(err, `Failed to download "${file.name}".`);
    } finally {
      setIsActionBusy(false);
    }
  };

  const renderMimeIcon = (mimeType: string) => {
    if (mimeType === GOOGLE_FOLDER_MIME) {
      return <Folder className="w-4 h-4 text-[#D97706] dark:text-amber-300" />;
    }
    if (mimeType === GOOGLE_DOC_MIME || mimeType.startsWith('text/')) {
      return <FileText className="w-4 h-4 text-[#0F766E] dark:text-emerald-300" />;
    }
    if (mimeType === 'application/json') {
      return <FileCode2 className="w-4 h-4 text-[#064E3B] dark:text-emerald-300" />;
    }
    if (mimeType.startsWith('audio/')) {
      return <FileAudio className="w-4 h-4 text-[#D97706] dark:text-amber-300" />;
    }
    if (mimeType.startsWith('image/')) {
      return <FileImage className="w-4 h-4 text-[#0F766E] dark:text-teal-300" />;
    }
    return <FileText className="w-4 h-4 text-[#404944] dark:text-emerald-200/80" />;
  };

  const selectedFiles = useMemo(
    () => driveFiles.filter((f) => selectedFileIds.has(f.id)),
    [driveFiles, selectedFileIds]
  );

  // Unauthenticated / Token-needed Landing Card
  if (needsAuth || !accessToken) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 pb-28 space-y-6">
        <div className="rounded-3xl border border-[#064E3B]/12 dark:border-emerald-300/20 bg-white dark:bg-[#0A2921] p-6 sm:p-8 ayah-card-resting space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#064E3B]/10 dark:bg-emerald-500/20 text-[#064E3B] dark:text-emerald-300 flex items-center justify-center shrink-0">
                <HardDrive className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#022C22] dark:text-[#E6FFF4]">
                  Google Drive Study Sync
                </h1>
                <p className="text-sm text-[#404944] dark:text-emerald-200/80">
                  Back up your Quranic study progress, export contemplation notes to Google Docs, and manage study files directly in Google Drive.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-2xl border border-[#064E3B]/10 dark:border-emerald-300/15 bg-[#FBFBFA] dark:bg-[#041D17] p-4 space-y-1.5">
              <p className="text-xs font-bold text-[#064E3B] dark:text-emerald-300">
                Cloud Study Snapshots
              </p>
              <p className="text-xs text-[#404944] dark:text-emerald-200/75 leading-relaxed">
                Save &amp; restore bookmarks, collections, Hifz review queues, Khatmah progress, and recitation logs.
              </p>
            </div>
            <div className="rounded-2xl border border-[#064E3B]/10 dark:border-emerald-300/15 bg-[#FBFBFA] dark:bg-[#041D17] p-4 space-y-1.5">
              <p className="text-xs font-bold text-[#D97706] dark:text-amber-300">
                Tadabbur Journal Export
              </p>
              <p className="text-xs text-[#404944] dark:text-emerald-200/75 leading-relaxed">
                Compile your saved verses and personal reflections directly into a formatted Google Doc.
              </p>
            </div>
            <div className="rounded-2xl border border-[#064E3B]/10 dark:border-emerald-300/15 bg-[#FBFBFA] dark:bg-[#041D17] p-4 space-y-1.5">
              <p className="text-xs font-bold text-[#0F766E] dark:text-teal-300">
                Drive Library Manager
              </p>
              <p className="text-xs text-[#404944] dark:text-emerald-200/75 leading-relaxed">
                Browse, preview, upload, organize, and download study files with explicit confirmation before edits or deletions.
              </p>
            </div>
          </div>

          {user && (
            <div className="rounded-2xl border border-[#D97706]/25 dark:border-amber-400/25 bg-[#FEF3C7]/25 dark:bg-amber-950/20 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-[#022C22] dark:text-[#E6FFF4]">
                Signed in as <span className="font-bold">{user.email || user.displayName}</span>. Session tokens remain in memory only; reconnect to resume Google Drive access.
              </div>
              <button
                type="button"
                onClick={onSignOut}
                className="text-xs font-semibold text-[#BA1A1A] dark:text-rose-300 hover:underline inline-flex items-center gap-1"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign out</span>
              </button>
            </div>
          )}

          {authError && (
            <div
              role="alert"
              className="rounded-xl border border-[#BA1A1A]/25 bg-[#BA1A1A]/8 dark:bg-rose-950/30 px-4 py-3 text-xs text-[#BA1A1A] dark:text-rose-300"
            >
              {authError}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-4 pt-1">
            <GoogleSignInButton
              onClick={onSignIn}
              disabled={isSigningIn}
              label={
                isSigningIn
                  ? 'Connecting to Google…'
                  : user
                  ? 'Reconnect Google Drive'
                  : 'Sign in with Google'
              }
            />
            <span className="text-xs text-[#404944] dark:text-emerald-200/70">
              Your access token is held in memory only and cleared automatically when you sign out or close the tab.
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-28 space-y-6">
      {/* Account & Storage Header */}
      <div className="rounded-2xl border border-[#064E3B]/12 dark:border-emerald-300/20 bg-white dark:bg-[#0A2921] p-4 sm:p-5 ayah-card-resting flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          {user?.photoURL || aboutInfo?.user?.photoLink ? (
            <img
              src={user?.photoURL || aboutInfo?.user?.photoLink}
              alt={user?.displayName || 'Google Account'}
              className="w-11 h-11 rounded-full border border-[#064E3B]/20 dark:border-emerald-300/30 object-cover shrink-0"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-11 h-11 rounded-full bg-[#064E3B] text-white dark:bg-emerald-500 dark:text-[#022C22] flex items-center justify-center font-bold text-base shrink-0">
              {(user?.displayName || user?.email || 'G')[0].toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-bold text-[#022C22] dark:text-[#E6FFF4] truncate">
                Google Drive Study Hub
              </h1>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#064E3B]/10 text-[#064E3B] dark:bg-emerald-400/20 dark:text-emerald-200">
                <CheckCircle2 className="w-3 h-3" />
                Connected
              </span>
            </div>
            <p className="text-xs text-[#404944] dark:text-emerald-200/80 truncate">
              {aboutInfo?.user?.displayName || user?.displayName || 'Google User'} ·{' '}
              {aboutInfo?.user?.emailAddress || user?.email}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {storageSummary && (
            <div className="min-w-[165px] space-y-1">
              <div className="flex items-center justify-between text-[11px] text-[#404944] dark:text-emerald-200/80 tabular-nums">
                <span>Drive Storage</span>
                <span className="font-semibold">
                  {storageSummary.usageLabel} / {storageSummary.limitLabel}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-[#064E3B]/10 dark:bg-emerald-300/15 overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#064E3B] dark:bg-emerald-400"
                  style={{ width: `${storageSummary.pct}%` }}
                />
              </div>
            </div>
          )}

          <button
            type="button"
            disabled={isLoadingDrive}
            onClick={() => void refreshDriveData()}
            className="min-h-[38px] px-3 py-1.5 rounded-xl border border-[#064E3B]/15 dark:border-emerald-300/20 text-xs font-semibold text-[#022C22] dark:text-[#E6FFF4] hover:bg-[#064E3B]/5 dark:hover:bg-emerald-400/10 inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDrive ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={onSignOut}
            className="min-h-[38px] px-3 py-1.5 rounded-xl border border-[#BA1A1A]/20 text-xs font-semibold text-[#BA1A1A] dark:text-rose-300 hover:bg-[#BA1A1A]/6 inline-flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Status Alert Banner */}
      {statusBanner && (
        <div
          role="status"
          className={`rounded-2xl border px-4 py-3 flex items-center justify-between gap-3 text-xs font-medium ${
            statusBanner.tone === 'success'
              ? 'border-[#064E3B]/20 bg-[#E6FFF4]/70 text-[#022C22] dark:border-emerald-400/25 dark:bg-emerald-950/40 dark:text-emerald-100'
              : 'border-[#BA1A1A]/25 bg-[#BA1A1A]/8 text-[#BA1A1A] dark:border-rose-400/25 dark:bg-rose-950/30 dark:text-rose-200'
          }`}
        >
          <span>{statusBanner.message}</span>
          <button
            type="button"
            onClick={() => setStatusBanner(null)}
            aria-label="Dismiss notification"
            className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Sub-Tabs */}
      <div
        role="tablist"
        aria-label="Google Drive Workspace Sections"
        className="inline-flex rounded-2xl bg-[#064E3B]/[0.05] dark:bg-[#0A2921] p-1 border border-[#064E3B]/10 dark:border-emerald-300/15"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'backup'}
          onClick={() => setActiveTab('backup')}
          className={`min-h-[40px] px-4 rounded-xl text-xs sm:text-sm font-semibold inline-flex items-center gap-2 transition-colors ${
            activeTab === 'backup'
              ? 'bg-[#064E3B] text-white dark:bg-emerald-500 dark:text-[#022C22]'
              : 'text-[#404944] hover:text-[#022C22] dark:text-emerald-200/80 dark:hover:text-white'
          }`}
        >
          <ArchiveRestore className="w-4 h-4" />
          <span>Cloud Backup &amp; Export</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'files'}
          onClick={() => setActiveTab('files')}
          className={`min-h-[40px] px-4 rounded-xl text-xs sm:text-sm font-semibold inline-flex items-center gap-2 transition-colors ${
            activeTab === 'files'
              ? 'bg-[#064E3B] text-white dark:bg-emerald-500 dark:text-[#022C22]'
              : 'text-[#404944] hover:text-[#022C22] dark:text-emerald-200/80 dark:hover:text-white'
          }`}
        >
          <FolderOpen className="w-4 h-4" />
          <span>Google Drive Files</span>
        </button>
      </div>

      {/* TAB 1: CLOUD BACKUP & STUDY JOURNAL EXPORT */}
      {activeTab === 'backup' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Create Snapshot + Google Doc Export */}
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-2xl border border-[#064E3B]/12 dark:border-emerald-300/20 bg-white dark:bg-[#0A2921] p-5 ayah-card-resting space-y-4">
              <div>
                <h2 className="text-base font-bold text-[#022C22] dark:text-[#E6FFF4]">
                  Current Local Study Snapshot
                </h2>
                <p className="text-xs text-[#404944] dark:text-emerald-200/75 mt-0.5">
                  Ready to back up to your &ldquo;{NOOR_DRIVE_FOLDER_NAME}&rdquo; folder
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="rounded-xl border border-[#064E3B]/10 dark:border-emerald-300/15 bg-[#FBFBFA] dark:bg-[#041D17] p-3">
                  <p className="text-[#404944] dark:text-emerald-200/75">Bookmarks &amp; Notes</p>
                  <p className="text-lg font-bold tabular-nums text-[#022C22] dark:text-[#E6FFF4]">
                    {backupPayload.bookmarks.length}
                  </p>
                </div>
                <div className="rounded-xl border border-[#064E3B]/10 dark:border-emerald-300/15 bg-[#FBFBFA] dark:bg-[#041D17] p-3">
                  <p className="text-[#404944] dark:text-emerald-200/75">Hifz Queue</p>
                  <p className="text-lg font-bold tabular-nums text-[#022C22] dark:text-[#E6FFF4]">
                    {backupPayload.hifzSpacedQueue.length}
                  </p>
                </div>
                <div className="rounded-xl border border-[#064E3B]/10 dark:border-emerald-300/15 bg-[#FBFBFA] dark:bg-[#041D17] p-3">
                  <p className="text-[#404944] dark:text-emerald-200/75">Khatmah Progress</p>
                  <p className="text-lg font-bold tabular-nums text-[#022C22] dark:text-[#E6FFF4]">
                    Day {backupPayload.khatmahPlan.currentDay}
                  </p>
                </div>
                <div className="rounded-xl border border-[#064E3B]/10 dark:border-emerald-300/15 bg-[#FBFBFA] dark:bg-[#041D17] p-3">
                  <p className="text-[#404944] dark:text-emerald-200/75">Recitation Logs</p>
                  <p className="text-lg font-bold tabular-nums text-[#022C22] dark:text-[#E6FFF4]">
                    {backupPayload.recitationHistory.length}
                  </p>
                </div>
              </div>

              <div className="space-y-2.5 pt-1">
                <button
                  type="button"
                  disabled={isActionBusy}
                  onClick={handleSaveNewBackup}
                  className="w-full min-h-[44px] px-4 rounded-xl bg-[#064E3B] text-white hover:bg-[#003527] dark:bg-emerald-500 dark:text-[#022C22] dark:hover:bg-emerald-400 text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" />
                  <span>Save New Backup to Google Drive</span>
                </button>

                <button
                  type="button"
                  disabled={isActionBusy}
                  onClick={handleExportJournalAsGoogleDoc}
                  className="w-full min-h-[44px] px-4 rounded-xl border border-[#D97706]/35 dark:border-amber-400/35 bg-[#FEF3C7]/35 dark:bg-amber-950/25 text-[#92400E] dark:text-amber-200 hover:bg-[#FEF3C7]/60 dark:hover:bg-amber-950/40 text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  <FileText className="w-4 h-4" />
                  <span>Export Tadabbur Journal to Google Docs</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right: Saved Drive Backups */}
          <div className="lg:col-span-7">
            <div className="rounded-2xl border border-[#064E3B]/12 dark:border-emerald-300/20 bg-white dark:bg-[#0A2921] p-5 ayah-card-resting space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-[#022C22] dark:text-[#E6FFF4]">
                    Saved Noor Recite Backups in Drive
                  </h2>
                  <p className="text-xs text-[#404944] dark:text-emerald-200/75 mt-0.5">
                    {noorFolder
                      ? `Folder: ${noorFolder.name}`
                      : `Saves will create "${NOOR_DRIVE_FOLDER_NAME}" automatically`}
                  </p>
                </div>
              </div>

              {isLoadingDrive ? (
                <div className="py-10 text-center text-xs text-[#404944] dark:text-emerald-200/75">
                  Checking Google Drive for study backups…
                </div>
              ) : backupFiles.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#064E3B]/20 dark:border-emerald-300/20 p-6 text-center space-y-2">
                  <p className="text-sm font-semibold text-[#022C22] dark:text-[#E6FFF4]">
                    No Noor Recite backups found yet
                  </p>
                  <p className="text-xs text-[#404944] dark:text-emerald-200/75">
                    Click &ldquo;Save New Backup to Google Drive&rdquo; to store your first encrypted-session cloud snapshot.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {backupFiles.map((file) => (
                    <div
                      key={file.id}
                      className="rounded-xl border border-[#064E3B]/12 dark:border-emerald-300/18 bg-[#FBFBFA] dark:bg-[#041D17] p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <p className="text-xs sm:text-sm font-bold text-[#022C22] dark:text-[#E6FFF4] truncate">
                          {file.name}
                        </p>
                        <p className="text-[11px] text-[#404944] dark:text-emerald-200/75 tabular-nums">
                          {file.modifiedTime
                            ? `Updated ${new Date(file.modifiedTime).toLocaleString()}`
                            : 'Saved snapshot'}{' '}
                          · {formatDriveBytes(file.size)}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          disabled={isActionBusy}
                          onClick={() => void handleRestoreFromDriveFile(file)}
                          className="min-h-[34px] px-2.5 rounded-lg bg-[#064E3B] text-white dark:bg-emerald-500 dark:text-[#022C22] text-xs font-semibold hover:opacity-90 inline-flex items-center gap-1 disabled:opacity-50"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Restore</span>
                        </button>
                        <button
                          type="button"
                          disabled={isActionBusy}
                          onClick={() => handleOverwriteBackup(file)}
                          className="min-h-[34px] px-2.5 rounded-lg border border-[#D97706]/35 text-[#B45309] dark:text-amber-300 text-xs font-semibold hover:bg-[#D97706]/10 inline-flex items-center gap-1 disabled:opacity-50"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Overwrite</span>
                        </button>
                        <button
                          type="button"
                          disabled={isActionBusy}
                          onClick={() => void handleOpenPreview(file)}
                          title="Preview JSON"
                          aria-label={`Preview ${file.name}`}
                          className="min-h-[34px] px-2 rounded-lg border border-[#064E3B]/15 dark:border-emerald-300/20 text-[#022C22] dark:text-[#E6FFF4] hover:bg-[#064E3B]/5"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={isActionBusy}
                          onClick={() => handleTrashOrRestoreFile(file, true)}
                          title="Move to Trash"
                          aria-label={`Move ${file.name} to Trash`}
                          className="min-h-[34px] px-2 rounded-lg border border-[#BA1A1A]/20 text-[#BA1A1A] dark:text-rose-300 hover:bg-[#BA1A1A]/8"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: GOOGLE DRIVE FILES BROWSER */}
      {activeTab === 'files' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="rounded-2xl border border-[#064E3B]/12 dark:border-emerald-300/20 bg-white dark:bg-[#0A2921] p-4 ayah-card-resting space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                {SCOPE_OPTIONS.map((opt) => {
                  const active = listScope === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setListScope(opt.id);
                        void refreshDriveData(opt.id, searchQuery);
                      }}
                      className={`min-h-[34px] px-3 rounded-lg text-xs font-semibold transition-colors ${
                        active
                          ? 'bg-[#064E3B] text-white dark:bg-emerald-500 dark:text-[#022C22]'
                          : 'bg-[#064E3B]/[0.05] text-[#404944] hover:text-[#022C22] dark:bg-[#041D17] dark:text-emerald-200/80 dark:hover:text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              {/* Actions: Upload + New Note */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <input
                  ref={uploadInputRef}
                  type="file"
                  onChange={handleUploadLocalFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={isActionBusy}
                  onClick={() => uploadInputRef.current?.click()}
                  className="min-h-[36px] px-3 rounded-xl border border-[#064E3B]/15 dark:border-emerald-300/20 text-xs font-semibold text-[#022C22] dark:text-[#E6FFF4] hover:bg-[#064E3B]/5 dark:hover:bg-emerald-400/10 inline-flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload File</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewNoteForm((v) => !v)}
                  className="min-h-[36px] px-3 rounded-xl bg-[#064E3B] text-white dark:bg-emerald-500 dark:text-[#022C22] text-xs font-semibold hover:opacity-95 inline-flex items-center gap-1.5"
                >
                  <FilePlus2 className="w-3.5 h-3.5" />
                  <span>New Study Note</span>
                </button>
              </div>
            </div>

            {/* Search Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void refreshDriveData(listScope, searchQuery);
              }}
              className="flex items-center gap-2"
            >
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#404944] dark:text-emerald-200/70 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search file names in Google Drive…"
                  className="w-full min-h-[40px] pl-9 pr-3 rounded-xl border border-[#064E3B]/15 dark:border-emerald-300/20 bg-[#FBFBFA] dark:bg-[#041D17] text-xs sm:text-sm text-[#022C22] dark:text-[#E6FFF4] focus:outline-none focus:ring-2 focus:ring-[#D97706]"
                />
              </div>
              <button
                type="submit"
                disabled={isLoadingDrive}
                className="min-h-[40px] px-4 rounded-xl bg-[#064E3B]/10 dark:bg-emerald-400/15 text-[#064E3B] dark:text-emerald-200 text-xs font-semibold hover:bg-[#064E3B]/15"
              >
                Search
              </button>
            </form>

            {/* Compose New Study Note Drawer */}
            {showNewNoteForm && (
              <form
                onSubmit={handleCreateNewNoteSubmit}
                className="rounded-xl border border-[#064E3B]/15 dark:border-emerald-300/20 bg-[#FBFBFA] dark:bg-[#041D17] p-4 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs font-bold text-[#022C22] dark:text-[#E6FFF4]">
                    Create Study Note in &ldquo;{NOOR_DRIVE_FOLDER_NAME}&rdquo;
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowNewNoteForm(false)}
                    className="text-xs text-[#404944] hover:underline dark:text-emerald-200/75"
                  >
                    Close
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={newNoteTitle}
                  onChange={(e) => setNewNoteTitle(e.target.value)}
                  placeholder="Note title (e.g., Surah Al-Kahf Tadabbur Reflections)"
                  className="w-full min-h-[38px] px-3 rounded-lg border border-[#064E3B]/15 dark:border-emerald-300/20 bg-white dark:bg-[#0A2921] text-xs text-[#022C22] dark:text-[#E6FFF4]"
                />
                <textarea
                  required
                  rows={4}
                  value={newNoteBody}
                  onChange={(e) => setNewNoteBody(e.target.value)}
                  placeholder="Write your Quranic notes, Tajweed reminders, or Hifz reflections…"
                  className="w-full p-3 rounded-lg border border-[#064E3B]/15 dark:border-emerald-300/20 bg-white dark:bg-[#0A2921] text-xs text-[#022C22] dark:text-[#E6FFF4]"
                />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <label className="inline-flex items-center gap-2 text-xs text-[#404944] dark:text-emerald-200/80 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newNoteAsGoogleDoc}
                      onChange={(e) => setNewNoteAsGoogleDoc(e.target.checked)}
                      className="accent-[#064E3B]"
                    />
                    <span>Create as Google Doc (uncheck for Markdown .md)</span>
                  </label>
                  <button
                    type="submit"
                    className="min-h-[36px] px-4 rounded-lg bg-[#064E3B] text-white dark:bg-emerald-500 dark:text-[#022C22] text-xs font-semibold"
                  >
                    Save to Google Drive
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Bulk Selection Action Bar */}
          {selectedFiles.length > 0 && (
            <div className="rounded-2xl border border-[#D97706]/30 bg-[#FEF3C7]/35 dark:bg-amber-950/30 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-bold text-[#022C22] dark:text-amber-200">
                {selectedFiles.length} file{selectedFiles.length === 1 ? '' : 's'} selected
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {listScope !== 'trashed' && (
                  <button
                    type="button"
                    onClick={() => handleBulkTrash(selectedFiles)}
                    className="min-h-[34px] px-3 rounded-lg bg-[#D97706] text-white text-xs font-semibold hover:bg-[#B45309] inline-flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Move Selected to Trash</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleDeletePermanently(selectedFiles)}
                  className="min-h-[34px] px-3 rounded-lg bg-[#BA1A1A] text-white text-xs font-semibold hover:bg-[#991B1B] inline-flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Permanently</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedFileIds(new Set())}
                  className="min-h-[34px] px-2.5 text-xs font-semibold text-[#404944] dark:text-emerald-200/80 hover:underline"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          {/* File List + Preview Split */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className={previewTarget ? 'lg:col-span-7' : 'lg:col-span-12'}>
              <div className="rounded-2xl border border-[#064E3B]/12 dark:border-emerald-300/20 bg-white dark:bg-[#0A2921] overflow-hidden ayah-card-resting">
                {isLoadingDrive ? (
                  <div className="p-10 text-center text-xs text-[#404944] dark:text-emerald-200/75">
                    Loading Google Drive files…
                  </div>
                ) : driveFiles.length === 0 ? (
                  <div className="p-10 text-center space-y-2">
                    <p className="text-sm font-semibold text-[#022C22] dark:text-[#E6FFF4]">
                      No files in this view
                    </p>
                    <p className="text-xs text-[#404944] dark:text-emerald-200/75">
                      {listScope === 'noor-folder'
                        ? 'Save a backup, export a study journal, or upload a file to populate your Noor Recite Study folder.'
                        : 'Try switching filter tabs or clearing your search query.'}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-[#064E3B]/10 dark:divide-emerald-300/12">
                    {driveFiles.map((file) => {
                      const isChecked = selectedFileIds.has(file.id);
                      const isRenaming = renamingFileId === file.id;
                      const isFolder = file.mimeType === GOOGLE_FOLDER_MIME;
                      return (
                        <div
                          key={file.id}
                          className="p-3.5 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#064E3B]/[0.02] dark:hover:bg-emerald-400/5 transition-colors"
                        >
                          <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              aria-label={`Select ${file.name}`}
                              onChange={(e) => {
                                setSelectedFileIds((prev) => {
                                  const next = new Set(prev);
                                  if (e.target.checked) next.add(file.id);
                                  else next.delete(file.id);
                                  return next;
                                });
                              }}
                              className="mt-1 sm:mt-0 accent-[#064E3B] shrink-0"
                            />
                            <div className="w-8 h-8 rounded-lg bg-[#064E3B]/[0.06] dark:bg-[#041D17] flex items-center justify-center shrink-0">
                              {renderMimeIcon(file.mimeType)}
                            </div>

                            <div className="min-w-0 flex-1">
                              {isRenaming ? (
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="text"
                                    value={renameDraft}
                                    onChange={(e) => setRenameDraft(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleConfirmRename(file);
                                      if (e.key === 'Escape') setRenamingFileId(null);
                                    }}
                                    className="flex-1 min-h-[32px] px-2 rounded-lg border border-[#D97706] bg-white dark:bg-[#041D17] text-xs text-[#022C22] dark:text-[#E6FFF4]"
                                    autoFocus
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleConfirmRename(file)}
                                    className="min-h-[32px] px-2.5 rounded-lg bg-[#064E3B] text-white text-xs font-semibold"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setRenamingFileId(null)}
                                    className="min-h-[32px] px-2 text-xs text-[#404944] dark:text-emerald-200/75"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <p className="text-xs sm:text-sm font-semibold text-[#022C22] dark:text-[#E6FFF4] truncate">
                                  {file.name}
                                </p>
                              )}
                              <p className="text-[11px] text-[#404944] dark:text-emerald-200/75 tabular-nums">
                                {file.modifiedTime
                                  ? new Date(file.modifiedTime).toLocaleDateString(undefined, {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric',
                                    })
                                  : '-'}{' '}
                                {file.size ? `· ${formatDriveBytes(file.size)}` : ''}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-1 shrink-0 pl-7 sm:pl-0">
                            {!isFolder && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => void handleOpenPreview(file)}
                                  title="Preview content"
                                  aria-label={`Preview ${file.name}`}
                                  className="min-h-[32px] px-2.5 rounded-lg border border-[#064E3B]/15 dark:border-emerald-300/20 text-xs font-semibold text-[#022C22] dark:text-[#E6FFF4] hover:bg-[#064E3B]/5 inline-flex items-center gap-1"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>Preview</span>
                                </button>
                                <button
                                  type="button"
                                  disabled={isActionBusy}
                                  onClick={() => void handleDownloadFile(file)}
                                  title="Download"
                                  aria-label={`Download ${file.name}`}
                                  className="min-h-[32px] px-2 rounded-lg border border-[#064E3B]/15 dark:border-emerald-300/20 text-[#022C22] dark:text-[#E6FFF4] hover:bg-[#064E3B]/5"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                            {listScope !== 'appdata' && listScope !== 'trashed' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleToggleStar(file)}
                                  title={file.starred ? 'Remove star' : 'Star file'}
                                  aria-label={`Toggle star for ${file.name}`}
                                  className={`min-h-[32px] px-2 rounded-lg border border-[#064E3B]/15 dark:border-emerald-300/20 ${
                                    file.starred
                                      ? 'text-[#D97706] dark:text-amber-300 bg-[#D97706]/10'
                                      : 'text-[#404944] dark:text-emerald-200/75 hover:bg-[#064E3B]/5'
                                  }`}
                                >
                                  <Star
                                    className={`w-3.5 h-3.5 ${file.starred ? 'fill-current' : ''}`}
                                  />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRenamingFileId(file.id);
                                    setRenameDraft(file.name);
                                  }}
                                  title="Rename"
                                  aria-label={`Rename ${file.name}`}
                                  className="min-h-[32px] px-2 rounded-lg border border-[#064E3B]/15 dark:border-emerald-300/20 text-[#404944] dark:text-emerald-200/80 hover:bg-[#064E3B]/5"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleTrashOrRestoreFile(file, true)}
                                  title="Move to Trash"
                                  aria-label={`Move ${file.name} to Trash`}
                                  className="min-h-[32px] px-2 rounded-lg border border-[#BA1A1A]/20 text-[#BA1A1A] dark:text-rose-300 hover:bg-[#BA1A1A]/8"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                            {listScope === 'trashed' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleTrashOrRestoreFile(file, false)}
                                  className="min-h-[32px] px-2.5 rounded-lg bg-[#064E3B] text-white text-xs font-semibold inline-flex items-center gap-1"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  <span>Restore</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeletePermanently([file])}
                                  className="min-h-[32px] px-2.5 rounded-lg bg-[#BA1A1A] text-white text-xs font-semibold inline-flex items-center gap-1"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Delete</span>
                                </button>
                              </>
                            )}
                            {listScope === 'appdata' && (
                              <button
                                type="button"
                                onClick={() => handleDeletePermanently([file])}
                                title="Delete App Data file"
                                aria-label={`Delete ${file.name}`}
                                className="min-h-[32px] px-2 rounded-lg border border-[#BA1A1A]/20 text-[#BA1A1A] dark:text-rose-300 hover:bg-[#BA1A1A]/8"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Inline Preview Drawer */}
            {previewTarget && (
              <div className="lg:col-span-5">
                <div className="rounded-2xl border border-[#064E3B]/15 dark:border-emerald-300/20 bg-white dark:bg-[#0A2921] p-4 sm:p-5 ayah-card-resting space-y-4 sticky top-4">
                  <div className="flex items-start justify-between gap-2 border-b border-[#064E3B]/10 dark:border-emerald-300/15 pb-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-wider text-[#0F766E] dark:text-emerald-300">
                        File Preview
                      </p>
                      <h3 className="text-sm font-bold text-[#022C22] dark:text-[#E6FFF4] truncate">
                        {previewTarget.name}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        clearPreviewObjectUrl();
                        setPreviewTarget(null);
                        setPreviewResult(null);
                      }}
                      aria-label="Close preview"
                      className="w-8 h-8 rounded-full flex items-center justify-center text-[#404944] hover:bg-[#064E3B]/8 dark:text-emerald-200/80"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {isLoadingPreview ? (
                    <div className="py-10 text-center text-xs text-[#404944] dark:text-emerald-200/75">
                      Loading file content from Google Drive…
                    </div>
                  ) : previewResult?.kind === 'image' && previewResult.objectUrl ? (
                    <img
                      src={previewResult.objectUrl}
                      alt={previewTarget.name}
                      className="w-full max-h-80 object-contain rounded-xl border border-[#064E3B]/10 dark:border-emerald-300/15 bg-[#FBFBFA] dark:bg-[#041D17]"
                    />
                  ) : previewResult?.kind === 'audio' && previewResult.objectUrl ? (
                    <div className="rounded-xl border border-[#064E3B]/12 dark:border-emerald-300/15 bg-[#FBFBFA] dark:bg-[#041D17] p-4 space-y-2">
                      <p className="text-xs font-semibold text-[#022C22] dark:text-[#E6FFF4]">
                        Audio Player
                      </p>
                      <audio controls src={previewResult.objectUrl} className="w-full" />
                    </div>
                  ) : previewResult?.kind === 'pdf' && previewResult.objectUrl ? (
                    <iframe
                      title={previewTarget.name}
                      src={previewResult.objectUrl}
                      className="w-full h-80 rounded-xl border border-[#064E3B]/12 dark:border-emerald-300/15"
                    />
                  ) : previewResult?.textContent !== undefined ? (
                    <div className="space-y-3">
                      <pre className="max-h-72 overflow-auto rounded-xl border border-[#064E3B]/12 dark:border-emerald-300/15 bg-[#FBFBFA] dark:bg-[#041D17] p-3 text-xs text-[#022C22] dark:text-[#E6FFF4] whitespace-pre-wrap font-mono leading-relaxed">
                        {previewResult.textContent || '(Empty file)'}
                      </pre>
                      {previewResult.kind === 'json' &&
                        parseNoorBackupJson(previewResult.textContent) && (
                          <button
                            type="button"
                            onClick={() => void handleRestoreFromDriveFile(previewTarget)}
                            className="w-full min-h-[38px] rounded-xl bg-[#064E3B] text-white dark:bg-emerald-500 dark:text-[#022C22] text-xs font-semibold inline-flex items-center justify-center gap-1.5"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Restore This Noor Backup</span>
                          </button>
                        )}
                    </div>
                  ) : (
                    <p className="text-xs text-[#404944] dark:text-emerald-200/75">
                      Preview is not available for this binary file type. Use Download to open it locally.
                    </p>
                  )}

                  {/* Activity Timeline (uses Drive Activity API when available) */}
                  {previewActivity.length > 0 && (
                    <div className="pt-2 border-t border-[#064E3B]/10 dark:border-emerald-300/15 space-y-2">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-[#404944] dark:text-emerald-200/80 inline-flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Recent Drive Activity</span>
                      </p>
                      <div className="space-y-1.5">
                        {previewActivity.map((act, i) => (
                          <div
                            key={`${act.timestamp}-${i}`}
                            className="flex items-center justify-between gap-2 text-[11px] text-[#404944] dark:text-emerald-200/75"
                          >
                            <span className="font-medium text-[#022C22] dark:text-[#E6FFF4]">
                              {act.actionLabel}
                            </span>
                            <span className="tabular-nums">
                              {act.timestamp ? new Date(act.timestamp).toLocaleString() : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mandatory Confirmation Dialog for all mutating/destructive operations */}
      <DriveConfirmModal
        dialog={confirmDialog}
        busy={isActionBusy}
        onCancel={() => !isActionBusy && setConfirmDialog(null)}
      />
    </div>
  );
};
