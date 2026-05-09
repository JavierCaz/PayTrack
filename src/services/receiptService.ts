import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import { Alert } from 'react-native';

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
      Alert.alert('Error', 'Failed to generate receipt image');
      return;
    }
    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Share Receipt',
      });
    } else {
      Alert.alert('Sharing not available', 'Sharing is not available on this device');
    }
  } catch (error) {
    console.error('Failed to share receipt:', error);
    Alert.alert('Error', 'Failed to share receipt');
  }
}

export async function saveReceiptToGallery(viewRef: React.RefObject<any>): Promise<void> {
  try {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant permission to save to gallery');
      return;
    }
    const uri = await captureReceipt(viewRef);
    if (!uri) {
      Alert.alert('Error', 'Failed to generate receipt image');
      return;
    }
    await MediaLibrary.saveToLibraryAsync(uri);
    Alert.alert('Saved', 'Receipt saved to gallery');
  } catch (error) {
    console.error('Failed to save receipt:', error);
    Alert.alert('Error', 'Failed to save receipt to gallery');
  }
}
