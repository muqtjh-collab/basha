import React, { useRef, useState } from 'react';

export interface FileUploadProps {
  onFileSelect: (file: File) => void;
  acceptTypes?: string[]; // e.g. ['image/*', 'application/pdf']
  maxSizeInBytes?: number; // e.g. 10 * 1024 * 1024
  label?: string;
  error?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  acceptTypes = ['image/*', 'application/pdf', 'video/*'],
  maxSizeInBytes = 100 * 1024 * 1024, // Defaults to 100MB max video limit
  label = 'اسحب الملفات إلى هنا أو انقر لاختيارها',
  error
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  const validateFile = (file: File): boolean => {
    setValidationError(null);
    
    // Size check
    if (file.size > maxSizeInBytes) {
      const mbLimit = Math.floor(maxSizeInBytes / (1024 * 1024));
      setValidationError(`حجم الملف كبير جداً. الحد الأقصى المسموح به هو ${mbLimit} ميغابايت.`);
      return false;
    }
    
    // Type check (rough validation)
    const fileType = file.type;
    const isAllowed = acceptTypes.some(type => {
      if (type.endsWith('/*')) {
        const prefix = type.split('/')[0];
        return fileType.startsWith(`${prefix}/`);
      }
      return type === fileType;
    });

    if (!isAllowed) {
      setValidationError('صيغة الملف غير مدعومة. يرجى رفع ملفات صور، PDF، أو فيديو صالحة.');
      return false;
    }

    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (validateFile(file)) {
        setSelectedFile(file);
        onFileSelect(file);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (validateFile(file)) {
        setSelectedFile(file);
        onFileSelect(file);
      }
    }
  };

  const triggerSelect = () => {
    fileInputRef.current?.click();
  };

  const clearSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFile(null);
    setValidationError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full flex flex-col gap-2 text-right">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept={acceptTypes.join(',')}
      />
      
      <div
        onClick={triggerSelect}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center gap-3 cursor-pointer select-none transition-all duration-200 ${
          isDragActive 
            ? 'border-primary-accent bg-primary-accent/5' 
            : 'border-border bg-white hover:border-primary-accent/40'
        }`}
      >
        <div className="text-4xl text-text-secondary/30">
          {selectedFile ? '📄' : '📤'}
        </div>
        
        {selectedFile ? (
          <div className="flex flex-col items-center gap-1 w-full max-w-xs">
            <span className="text-sm font-semibold text-text-primary truncate w-full text-center">
              {selectedFile.name}
            </span>
            <span className="text-xs text-text-secondary">
              {(selectedFile.size / (1024 * 1024)).toFixed(2)} ميغابايت
            </span>
            <button
              onClick={clearSelection}
              className="text-xs text-error font-semibold hover:underline mt-2 focus:outline-none"
            >
              إلغاء الملف المختار
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <span className="text-sm font-semibold text-text-primary">{label}</span>
            <span className="text-xs text-text-secondary">الحد الأقصى للمستندات والملفات: 20MB (صور/مستندات)، 100MB (فيديو)</span>
          </div>
        )}
      </div>

      {(validationError || error) && (
        <span className="text-xs font-medium text-error mt-0.5">
          {validationError || error}
        </span>
      )}
    </div>
  );
};
export default FileUpload;
