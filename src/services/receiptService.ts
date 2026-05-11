import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import { Alert } from 'react-native';
import { t } from '../i18n';

export async function captureReceipt(viewRef: React.RefObject<any>): Promise<string | null> {
  try {
    const uri = await captureRef(viewRef, {
      format: 'png',
      quality: 1,
      result: 'tmpfile',
    });
    return uri;
  } catch (error) {
    console.error('Failed to capture receipt:', error);
    return null;
  }
}

export async function shareReceipt(viewRef: React.RefObject<any>): Promise<void> {
  try {
    const uri = await captureReceipt(viewRef);
    if (!uri) {
      Alert.alert(t('common.error'), t('receipt.generateError'));
      return;
    }
    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: t('receipt.title'),
      });
    } else {
      Alert.alert(t('receipt.sharingNotAvailableTitle'), t('receipt.sharingNotAvailable'));
    }
  } catch (error) {
    console.error('Failed to share receipt:', error);
    Alert.alert(t('common.error'), t('receipt.shareError'));
  }
}

export async function saveReceiptToGallery(viewRef: React.RefObject<any>): Promise<void> {
  try {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('receipt.permissionNeeded'), t('receipt.permissionDesc'));
      return;
    }
    const uri = await captureReceipt(viewRef);
    if (!uri) {
      Alert.alert(t('common.error'), t('receipt.generateError'));
      return;
    }
    await MediaLibrary.saveToLibraryAsync(uri);
    Alert.alert(t('common.success'), t('receipt.saveSuccess'));
  } catch (error) {
    console.error('Failed to save receipt:', error);
    Alert.alert(t('common.error'), t('receipt.saveFailed'));
  }
}
