import { useState, useCallback } from 'react'
import { Upload, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ImageUploadProps {
  value?: string | null
  onChange: (url: string | null) => void
  disabled?: boolean
  className?: string
}

const MAX_SIZE = 5 * 1024 * 1024
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export function ImageUpload({
  value,
  onChange,
  disabled,
  className,
}: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

  const handleUpload = useCallback(async (file: File) => {
    setError(null)
    setIsUploading(true)

    if (file.size > MAX_SIZE) {
      setError('La imagen debe ser menor a 5MB')
      setIsUploading(false)
      return
    }

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Formato no soportado. Usa JPG, PNG o WebP')
      setIsUploading(false)
      return
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', uploadPreset)

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      )

      const data = await response.json()

      if (data.secure_url) {
        onChange(data.secure_url)
      } else {
        setError(data.error?.message || 'Error al subir imagen')
      }
    } catch {
      setError('Error de conexión')
    } finally {
      setIsUploading(false)
    }
  }, [cloudName, uploadPreset, onChange])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      if (disabled || isUploading) return

      const file = e.dataTransfer.files[0]
      if (file) handleUpload(file)
    },
    [disabled, isUploading, handleUpload]
  )

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleUpload(file)
      e.target.value = ''
    },
    [handleUpload]
  )

  if (value) {
    return (
      <div className={cn('relative rounded-lg overflow-hidden border', className)}>
        <img
          src={value}
          alt="Preview"
          className="w-full h-48 object-cover"
        />
        <button
          type="button"
          onClick={() => onChange(null)}
          disabled={disabled}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer',
        isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      onDragOver={(e) => {
        e.preventDefault()
        if (!disabled) setIsDragging(true)
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => {
        if (!disabled && !isUploading) {
          document.getElementById('image-upload-input')?.click()
        }
      }}
    >
      <input
        id="image-upload-input"
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        onChange={handleFileSelect}
        disabled={disabled || isUploading}
        className="hidden"
      />

      {isUploading ? (
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Subiendo...</span>
        </div>
      ) : (
        <>
          <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
          <span className="text-sm text-muted-foreground">
            Arrastra una imagen o haz clic para seleccionar
          </span>
          <span className="text-xs text-muted-foreground/70 mt-1 block">
            JPG, PNG o WebP • Máx 5MB
          </span>
        </>
      )}

      {error && (
        <p className="text-sm text-destructive mt-2">{error}</p>
      )}
    </div>
  )
}