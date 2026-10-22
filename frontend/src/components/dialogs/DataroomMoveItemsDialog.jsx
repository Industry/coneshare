import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { MoveDestinationDialog } from './MoveDestinationDialog';
import { getDataroom, getDataroomFolderContents, createDataroomFolder } from '../../services/api';

export function DataroomMoveItemsDialog({
  isOpen,
  onOpenChange,
  onConfirm,
  dataroomId,
  sourceFolderId = null,
  selectedFolderIds = [],
  selectedCount = 0,
}) {
  const { t } = useTranslation();

  const handleFetchContents = useCallback(
    async (folderId) => {
      const response = folderId
        ? await getDataroomFolderContents(folderId)
        : await getDataroom(dataroomId);

      const currentFolder =
        folderId && response?.data
          ? {
              id: response.data.id,
              name: response.data.name,
              ancestors: response.data.ancestors || [],
            }
          : null;

      const subFolders =
        response?.data?.sub_folders ||
        (response?.data?.items
          ? response.data.items.filter((item) => item.type === 'folder')
          : []) ||
        [];

      return { currentFolder, subFolders };
    },
    [dataroomId]
  );

  const handleCreateFolder = useCallback(
    async (name, parentFolderId) => {
      return await createDataroomFolder({
        name,
        dataroom: dataroomId,
        parent: parentFolderId,
      });
    },
    [dataroomId]
  );

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
      description={t('datarooms.moveItemsDescription')}
      confirmAriaLabel={t('documents.moveHere')}
    />
  );
}
