import { useEffect, useRef, useState } from 'react'
import Uppy from '@uppy/core'
import Dashboard from '@uppy/react/dashboard'
import XHRUpload from '@uppy/xhr-upload'
import zh_CN from '@uppy/locales/lib/zh_CN.js'
import { AlertCircleIcon, CheckCircle2Icon } from 'lucide-react'
import { apiBaseUrl } from '../auth/config'
import { useAuth } from '../auth/AuthProvider'
import { useUIStore } from '../store/ui'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

import '@uppy/core/css/style.min.css'
import '@uppy/dashboard/css/style.min.css'

function createUppy(getToken: () => string) {
  const endpoint = `${apiBaseUrl()}/api/v1/docs`

  return new Uppy({
    id: 'agentdesk-docs',
    autoProceed: false,
    allowMultipleUploadBatches: true,
    locale: zh_CN,
    restrictions: {
      allowedFileTypes: [
        '.pdf',
        '.docx',
        '.txt',
        '.md',
        'image/*',
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'text/markdown',
      ],
    },
  }).use(XHRUpload, {
    endpoint,
    fieldName: 'file',
    formData: true,
    limit: 1,
    timeout: 120_000,
    headers: () => {
      const t = getToken()
      if (!t) return {} as Record<string, string>
      return {
        Authorization: t.startsWith('Bearer ') ? t : `Bearer ${t}`,
      }
    },
  })
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUploaded: () => void
}

export function UploadDialog({ open, onOpenChange, onUploaded }: Props) {
  const auth = useAuth()
  const token = auth.user?.access_token ?? ''
  const notice = useUIStore((s) => s.lastUploadNotice)
  const setNotice = useUIStore((s) => s.setLastUploadNotice)
  const [error, setError] = useState<string | null>(null)
  const tokenRef = useRef(token)
  tokenRef.current = token

  const [uppy] = useState(() => createUppy(() => tokenRef.current))

  useEffect(() => {
    const xhr = uppy.getPlugin('XHRUpload')
    xhr?.setOptions({
      endpoint: `${apiBaseUrl()}/api/v1/docs`,
      headers: () => {
        const t = tokenRef.current
        if (!t) return {} as Record<string, string>
        return {
          Authorization: t.startsWith('Bearer ') ? t : `Bearer ${t}`,
        }
      },
    })
  }, [uppy, token])

  useEffect(() => {
    const onComplete = (result: {
      successful?: Array<{ name?: string | null }>
      failed?: Array<{ error?: string | null }>
    }) => {
      const ok = result.successful?.length ?? 0
      const fail = result.failed?.length ?? 0
      if (ok > 0) {
        setNotice(`已成功上传 ${ok} 个文件，系统正在解析并写入知识库`)
        setError(null)
        onUploaded()
      }
      if (fail > 0) {
        setError(
          `有 ${fail} 个文件上传失败：${result.failed?.[0]?.error || '未知错误'}`,
        )
      }
    }
    const onError = (err: { message?: string } | Error) => {
      setError(('message' in err && err.message) || '上传出错')
    }
    const onUploadError = (
      _file: unknown,
      err: { message?: string } | Error | undefined,
      response?: { status?: number; body?: unknown },
    ) => {
      const detail =
        (err && 'message' in err && err.message) ||
        (typeof response?.body === 'object' &&
        response.body &&
        'detail' in (response.body as object)
          ? String((response.body as { detail?: string }).detail)
          : '') ||
        `上传失败${response?.status ? ` (${response.status})` : ''}`
      setError(detail)
    }

    uppy.on('complete', onComplete as never)
    uppy.on('error', onError as never)
    uppy.on('upload-error', onUploadError as never)

    return () => {
      uppy.off('complete', onComplete as never)
      uppy.off('error', onError as never)
      uppy.off('upload-error', onUploadError as never)
    }
  }, [uppy, setNotice, onUploaded])

  // Fresh Uppy session each open; clear leftovers on close so the same
  // file can be chosen again after a failed ingest/upload.
  useEffect(() => {
    for (const f of uppy.getFiles()) {
      uppy.removeFile(f.id)
    }
    if (!open) {
      setError(null)
    }
  }, [open, uppy])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex h-[min(90vh,720px)] max-w-3xl flex-col gap-3 overflow-hidden p-4 sm:max-w-3xl"
        style={{ display: 'flex' }}
      >
        <DialogHeader className="shrink-0">
          <DialogTitle>上传文档</DialogTitle>
          <DialogDescription>
            支持 PDF、Word、文本、Markdown 与图片。图片将通过视觉模型提取文字后入库。
          </DialogDescription>
        </DialogHeader>

        <div className="uppy-host min-h-0 flex-1">
          <Dashboard
            uppy={uppy}
            proudlyDisplayPoweredByUppy={false}
            hideProgressDetails={false}
            disableStatusBar={false}
            width="100%"
            height="100%"
          />
        </div>

        {error ? (
          <Alert variant="destructive" className="shrink-0">
            <AlertCircleIcon />
            <AlertTitle>上传失败</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {notice ? (
          <Alert className="shrink-0">
            <CheckCircle2Icon />
            <AlertTitle>完成</AlertTitle>
            <AlertDescription>{notice}</AlertDescription>
          </Alert>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}