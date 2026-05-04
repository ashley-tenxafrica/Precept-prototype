import React, { useState, useRef, useEffect } from 'react';
import { AssessmentItem, GenUIToolCall } from '../types';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Upload, Send } from 'lucide-react';

export function InterviewView({
  item,
  onComplete
}: {
  item: AssessmentItem;
  onComplete: () => void;
}) {
  const [messages, setMessages] = useState<any[]>([]);
  const [currentTool, setCurrentTool] = useState<GenUIToolCall | null>(null);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [contextText, setContextText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentTool]);

  const handleContextUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/ai/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.text) {
        setContextText(data.text);
        setMessages(prev => [...prev, { role: 'system', text: `Context loaded from ${file.name}` }]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const startExtraction = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/ai/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history: messages, contextText, itemId: item.id })
      });
      const data = await res.json();
      
      // Update item logic is on parent, just call onComplete
      // Actually we must update backend first, but we are doing it via a hack: parent reads DB again?
      // Since extraction is ephemeral on AI side, let's update DB
      await fetch(`/api/data/assessments/${item.id}/extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      
      onComplete();
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const submitAnswer = async (answer: string) => {
    const userMsg = { role: 'user', parts: [{ text: answer }] };
    setMessages(prev => [...prev, userMsg]);
    setCurrentTool(null);
    setInputText("");
    await askAI(answer);
  };

  const askAI = async (message: string) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history: messages, contextText })
      });
      
      if (!res.body) return;
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      
      let fullText = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        // lines are 'data: { "text": "..." }\\n\\n'
        const lines = chunk.split('\\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.substring(6);
            try {
              const data = JSON.parse(dataStr);
              if (data.text) fullText += data.text;
            } catch (e) {}
          }
        }
      }
      
      try {
        const toolJson = JSON.parse(fullText);
        setCurrentTool(toolJson);
        setMessages(prev => [...prev, { role: 'model', parts: [{ text: JSON.stringify(toolJson) }] }]);
      } catch (e) {
        console.error("Failed to parse tool", fullText);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[70vh] border rounded-md">
      <div className="p-4 border-b flex justify-between items-center bg-slate-50">
        <div>
          <h2 className="font-bold">Interview: {item.title}</h2>
          <p className="text-xs text-slate-500">Provide details about this processing activity.</p>
        </div>
        <div className="flex gap-2">
          <Input type="file" className="hidden" ref={fileInputRef} onChange={handleContextUpload} accept="application/pdf" />
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isLoading}>
            <Upload className="w-4 h-4 mr-2" /> Upload Evidence
          </Button>
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={startExtraction} disabled={messages.length === 0 || isLoading}>
            Complete & Review
          </Button>
        </div>
      </div>
      
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.role === 'system' ? (
                <div className="text-xs text-center text-slate-400 w-full">{m.text}</div>
              ) : (
                <div className={`max-w-[80%] p-3 rounded-lg ${m.role === 'user' ? 'bg-blue-100 text-blue-900' : 'bg-slate-100 text-slate-900'}`}>
                  {m.role === 'model' ? (
                    <span className="opacity-70 text-xs italic">[AI Evaluated response]</span>
                  ) : (
                    m.parts[0].text
                  )}
                </div>
              )}
            </div>
          ))}

          {currentTool && (
            <Card className="w-full bg-white shadow-sm border-blue-200">
              <CardContent className="pt-6">
                <p className="font-medium text-lg mb-4">{currentTool.question}</p>
                
                {currentTool.tool === 'yes_no' && (
                  <div className="flex gap-4">
                    <Button onClick={() => submitAnswer('Yes')} className="flex-1" variant="outline">Yes</Button>
                    <Button onClick={() => submitAnswer('No')} className="flex-1" variant="outline">No</Button>
                  </div>
                )}
                
                {currentTool.tool === 'checkbox_cards' && currentTool.options && (
                  <div className="space-y-2">
                    {currentTool.options.map(opt => (
                      <Button key={opt} onClick={() => submitAnswer(opt)} variant="outline" className="w-full justify-start text-left h-auto py-3">
                        {opt}
                      </Button>
                    ))}
                    <Button onClick={() => submitAnswer('None of the above')} variant="ghost" className="w-full mt-2">None of the above</Button>
                  </div>
                )}

                {currentTool.tool === 'free_text' && (
                  <div className="flex gap-2">
                    <Input 
                      value={inputText} 
                      onChange={e => setInputText(e.target.value)} 
                      placeholder="Type your response..."
                      onKeyDown={e => e.key === 'Enter' && submitAnswer(inputText)}
                    />
                    <Button onClick={() => submitAnswer(inputText)} disabled={!inputText.trim()}><Send className="w-4 h-4" /></Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {messages.length === 0 && !currentTool && (
            <div className="text-center py-10">
              <Button onClick={() => askAI("Hello, please start the assessment.")} className="bg-black">
                Start Interview
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
