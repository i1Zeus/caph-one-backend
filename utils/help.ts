import * as sharp from 'sharp';
import * as crypto from 'crypto';

export async function compressImage(base64Image: string): Promise<string> {
    try {
      // Remove the data URL prefix if present
      const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');

      // Convert base64 to buffer
      const buffer = Buffer.from(base64Data, 'base64');

      // Compress image
      const compressedImageBuffer = await sharp(buffer)
        .resize(1200, 1200, { // Adjust dimensions as needed
          fit: 'inside',
          withoutEnlargement: true
        })
        .webp({ quality: 80 })
        .toBuffer();

      // Convert back to base64
      return `data:image/webp;base64,${compressedImageBuffer.toString('base64')}`;
    } catch (error) {
      throw new Error(`Image compression failed: ${error.message}`);
    }
  }

/**
 * Cleans and formats a phone number by:
 * - Converting Arabic numerals to English digits
 * - Removing + sign if present
 * - Handling Iraqi phone number formats
 * @param phoneNumber The phone number to clean
 * @returns The cleaned phone number without @c.us suffix
 */
export function cleanPhoneNumber(phoneNumber: string): string {
  // Convert Arabic numerals to regular digits
  const arabicToEnglish: { [key: string]: string } = {
    '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
    '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9'
  };
  
  let cleaned = phoneNumber;
  
  // Replace Arabic numerals with English numerals
  Object.keys(arabicToEnglish).forEach(arabic => {
    cleaned = cleaned.replace(new RegExp(arabic, 'g'), arabicToEnglish[arabic]);
  });
  
  // Remove + sign if present
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }
  
  // Remove all non-digit characters
  cleaned = cleaned.replace(/\D/g, '');
  
  // Handle Iraqi phone numbers
  if (cleaned.startsWith('07') && cleaned.length === 11) {
    // Convert 07736000954 to 9647736000954
    cleaned = '964' + cleaned.substring(1);
  } else if (cleaned.startsWith('7') && cleaned.length === 10) {
    // Convert 7736000954 to 9647736000954
    cleaned = '964' + cleaned;
  } else if (!cleaned.startsWith('964') && cleaned.length === 10) {
    // Add Iraq country code for other 10-digit numbers
    cleaned = '964' + cleaned;
  }
  
  return cleaned;
}

/**
 * Formats a phone number for WhatsApp by cleaning it and adding @c.us suffix
 * @param phoneNumber The phone number to format
 * @returns The formatted phone number with @c.us suffix
 */
export function formatPhoneNumberForWhatsApp(phoneNumber: string): string {
  const cleaned = cleanPhoneNumber(phoneNumber);
  return cleaned + '@c.us';
}

export function encrypt(value: any, secretKey: string) {
  const key = crypto.createHash('sha256').update(secretKey).digest(); // 32 bytes
  const cipher = crypto.createCipheriv('aes-256-ecb', key, null);
  cipher.setAutoPadding(true);

  let encrypted = cipher.update(value, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return encrypted;
}

export function decrypt(encryptedValue: any, secretKey: string) {
  const key = crypto.createHash('sha256').update(secretKey).digest();
  const decipher = crypto.createDecipheriv('aes-256-ecb', key, null);
  decipher.setAutoPadding(true);

  let decrypted = decipher.update(encryptedValue, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}