import { memo, useCallback, useRef, useState, type DragEvent, type ChangeEvent } from 'react';
import { Upload, ClipboardPaste, X, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { parseCsv, type IUsageRecord } from '@/data/usage';

interface UploadSectionProps {
  records: IUsageRecord[];
  onRecordsChange: (records: IUsageRecord[]) => void;
}

export default memo(function UploadSection({ records, onRecordsChange }: UploadSectionProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [fileName, setFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const file = files[0];
      if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
        toast.error('请上传 CSV 格式的文件');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const text = String(reader.result || '');
          const parsed = parseCsv(text);
          if (parsed.length === 0) {
            toast.error('CSV 解析失败，未读取到有效数据');
            return;
          }
          setFileName(file.name);
          onRecordsChange(parsed);
          toast.success(`已加载 ${parsed.length} 条记录`);
        } catch (e) {
          toast.error('文件解析出错：' + String(e));
        }
      };
      reader.onerror = () => toast.error('文件读取失败');
      reader.readAsText(file);
    },
    [onRecordsChange],
  );

  const onDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  const onDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onFileInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      handleFiles(e.target.files);
      // 重置 input 以便同一文件重复上传也会触发 change
      if (e.target) e.target.value = '';
    },
    [handleFiles],
  );

  const handlePasteSubmit = useCallback(() => {
    if (!pasteText.trim()) {
      toast.error('请先粘贴 CSV 内容');
      return;
    }
    try {
      const parsed = parseCsv(pasteText);
      if (parsed.length === 0) {
        toast.error('CSV 解析失败，未读取到有效数据');
        return;
      }
      setFileName('粘贴数据');
      onRecordsChange(parsed);
      setPasteOpen(false);
      setPasteText('');
      toast.success(`已加载 ${parsed.length} 条记录`);
    } catch (e) {
      toast.error('解析出错：' + String(e));
    }
  }, [pasteText, onRecordsChange]);

  return (
    <section className="w-full">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">CSV 数据可视化工具</h1>
            <p className="text-sm text-muted-foreground mt-1">
              上传 CSV 文件或粘贴数据，快速查看各模型 Token 使用趋势
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPasteOpen(true)}
              className="gap-2"
            >
              <ClipboardPaste className="size-4" />
              粘贴文本
            </Button>
            <Button size="sm" onClick={() => fileInputRef.current?.click()} className="gap-2">
              <Upload className="size-4" />
              上传文件
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={onFileInputChange}
            />
          </div>
        </div>

        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          className={
            'relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed ' +
            'px-6 py-10 md:py-14 transition-colors cursor-pointer ' +
            (isDragging
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/60 hover:bg-muted/30')
          }
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
            {records.length > 0 ? (
              <CheckCircle2 className="size-6 text-primary" />
            ) : (
              <Upload className="size-6 text-primary" />
            )}
          </div>
          {records.length > 0 ? (
            <div className="text-center">
              <p className="text-sm font-medium">
                <span className="text-foreground">{fileName || '已加载数据'}</span>
                <span className="text-muted-foreground"> · {records.length} 条记录</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                点击或拖拽文件到此区域以重新上传
              </p>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-sm font-medium">拖拽 CSV 文件到此，或点击选择文件</p>
              <p className="text-xs text-muted-foreground mt-1">
                支持 .csv 格式，需包含 date, model, total_tokens 等字段
              </p>
            </div>
          )}
          {isDragging && (
            <div className="absolute inset-0 rounded-xl bg-primary/5 pointer-events-none" />
          )}
        </div>
      </div>

      <Dialog open={pasteOpen} onOpenChange={setPasteOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardPaste className="size-5" />
              粘贴 CSV 内容
            </DialogTitle>
          </DialogHeader>
          <Textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder="date,model,input_tokens,..."
            className="min-h-[240px] font-mono text-xs"
          />
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setPasteOpen(false)}>
              <X className="size-4 mr-1" />
              取消
            </Button>
            <Button size="sm" onClick={handlePasteSubmit}>
              解析并渲染
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
});
