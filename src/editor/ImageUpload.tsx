import { useCallback, useEffect, useRef, useState } from "react";
import ReactCrop, { type Crop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Check, X } from "lucide-react";

interface ImageUploadProps {
  onInsert: (src: string, alt?: string, width?: number, height?: number) => void;
  onClose: () => void;
}

export function ImageUpload({ onInsert, onClose }: ImageUploadProps) {
  const [imageUrl, setImageUrl] = useState<string>("");
  const [altText, setAltText] = useState<string>("");
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<Crop>();
  const [showCrop, setShowCrop] = useState(false);
  const [fileInput, setFileInput] = useState<File | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cleanup Object URLs on unmount
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("请选择图片文件");
      return;
    }

    // Revoke previous blob URL if exists
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }

    setFileInput(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setImageUrl(url);
    setShowCrop(true);
  }, [previewUrl]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect],
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData.items;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            handleFileSelect(file);
            break;
          }
        }
      }
    },
    [handleFileSelect],
  );

  const handleUrlInput = useCallback(() => {
    if (imageUrl) {
      setPreviewUrl(imageUrl);
      setShowCrop(true);
    }
  }, [imageUrl]);

  const handleCropComplete = useCallback(() => {
    if (!completedCrop || !imageRef.current) {
      onInsert(imageUrl, altText);
      onClose();
      return;
    }

    const canvas = document.createElement("canvas");
    const img = imageRef.current;
    const scaleX = img.naturalWidth / img.width;
    const scaleY = img.naturalHeight / img.height;

    canvas.width = completedCrop.width;
    canvas.height = completedCrop.height;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      onInsert(imageUrl, altText);
      onClose();
      return;
    }

    ctx.drawImage(
      img,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      completedCrop.width,
      completedCrop.height,
    );

    const croppedUrl = canvas.toDataURL("image/png");
    onInsert(croppedUrl, altText, completedCrop.width, completedCrop.height);
    onClose();
  }, [completedCrop, imageUrl, altText, onInsert, onClose]);

  const handleCancel = useCallback(() => {
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl("");
    setImageUrl("");
    setAltText("");
    setShowCrop(false);
    setFileInput(null);
    setCrop(undefined);
    setCompletedCrop(undefined);
  }, [previewUrl]);

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      onPaste={handlePaste}
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-auto">
        <div className="p-4 border-b dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-lg font-semibold">插入图片</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          {!showCrop ? (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  图片地址
                </label>
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/image.png"
                  className="w-full px-3 py-2 border dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                />
                <button
                  type="button"
                  onClick={handleUrlInput}
                  disabled={!imageUrl}
                  className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  预览
                </button>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  或上传文件
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleFileSelect(file);
                    }
                  }}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-8 border-2 border-dashed dark:border-gray-600 rounded hover:border-blue-500 dark:hover:border-blue-400"
                >
                  点击选择图片或拖拽到此处
                </button>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  替代文本（可选）
                </label>
                <input
                  type="text"
                  value={altText}
                  onChange={(e) => setAltText(e.target.value)}
                  placeholder="图片描述"
                  className="w-full px-3 py-2 border dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                />
              </div>
            </>
          ) : (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  裁剪图片（可选）
                </label>
                <div className="max-h-96 overflow-auto">
                  <ReactCrop
                    crop={crop}
                    onChange={(c) => setCrop(c)}
                    onComplete={(c) => setCompletedCrop(c)}
                  >
                    <img
                      ref={imageRef}
                      src={previewUrl}
                      alt="Preview"
                      className="max-w-full"
                    />
                  </ReactCrop>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  替代文本
                </label>
                <input
                  type="text"
                  value={altText}
                  onChange={(e) => setAltText(e.target.value)}
                  placeholder="图片描述"
                  className="w-full px-3 py-2 border dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCropComplete}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  {completedCrop ? "插入裁剪图片" : "插入原图"}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  重新选择
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
