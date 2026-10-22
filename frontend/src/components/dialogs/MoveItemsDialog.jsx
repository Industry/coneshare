import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { MoveDestinationDialog } from './MoveDestinationDialog';
import { getRootFolderContents, getFolderContents, createFolder } from '../../services/api';

export function MoveItemsDialog({
  isOpen,
  onOpenChange,
  onConfirm,
  sourceFolderId = undefined,
  selectedFolderIds = [],
  selectedCount = 0,
}) {
  const { t } = useTranslation();

  const handleFetchContents = useCallback(async (folderId) => {
    const response = folderId
      ? await getFolderContents(folderId)
      : await getRootFolderContents();

    const currentFolder =
      folderId && response?.data?.current_folder
        ? {
            id: response.data.current_folder.id,
            name: response.data.current_folder.name,
            ancestors: response.data.current_folder.ancestors || [],
          }
        : null;

    const subFolders = response?.data?.sub_folders || [];

    return { currentFolder, subFolders };
  }, []);

  const handleCreateFolder = useCallback(async (name, parentFolderId) => {
    return await createFolder(name, parentFolderId || null);
  }, []);

  return (
    <MoveDestinationDialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
      onFetchContents={handleFetchContents}
      onCreateFolder={handleCreateFolder}
      sourceFolderId={sourceFolderId}
      selectedFolderIds={selectedFolderIds}
      selectedCount={selectedCount}
      title={t('documents.moveTitle')}
      description={t('documents.selectTargetFolder')}
    />
  );
}
