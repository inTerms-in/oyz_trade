"use client";

import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bot, Send, User as UserIcon, Loader2, Mic, MicOff } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ChatbotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Message {
  id: number;
  sender: "user" | "bot";
  text?: string;
  history?: PurchaseHistory[];
  stock?: number;
  itemName?: string;
  itemCode?: string;
  rackNo?: string; // Added rackNo
}

interface PurchaseHistory {
  shopName: string;
  purchaseDate: string;
  unitPrice: number;
}

interface ContextItem {
  ItemId: number;
  ItemName: string | null;
  ItemCode?: string | null;
  current_stock: number;
  RackNo?: string | null; // Added RackNo
}

const WELCOME_MESSAGE: Message = {
  id: 0,
  sender: "bot",
  text: "Hello! I'm your purchase assistant. You can ask for an item's history ('milk'), check stock ('stock of milk'), create new entries ('new category Snacks'), or ask me to navigate ('go to items').",
};

export function ChatbotDialog({ open, onOpenChange }: ChatbotDialogProps) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [contextualItems, setContextualItems] = useState<ContextItem[] | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    setInput(transcript);
  }, [transcript]);

  useEffect(() => {
    if (!isLoading && open) {
      inputRef.current?.focus();
    }
  }, [isLoading, open, messages]);

  const formatCurrency = (amount: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "INR" }).format(amount);
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString();

  const getHistoryAndStockForItem = async (item: ContextItem): Promise<Message> => {
    const { data: history, error: historyError } = await supabase
      .from("PurchaseItem")
      .select("UnitPrice, Purchase(SupplierMaster(SupplierName), PurchaseDate)")
      .eq("ItemId", item.ItemId)
      // .eq("user_id", user.id) // Removed user_id filter
      .order("PurchaseId", { ascending: false })
      .limit(10);
    
    if (historyError) {
      console.error("Error fetching history:", historyError);
      return { id: Date.now() + 1, sender: "bot", text: `I found "${item.ItemName || 'Unknown Item'}", but there was an error fetching its history.` };
    }

    const purchaseHistory = history?.map((h: any) => ({
      shopName: h.Purchase.SupplierMaster?.SupplierName || 'N/A',
      purchaseDate: h.Purchase.PurchaseDate,
      unitPrice: h.UnitPrice,
    })) || [];

    let responseText = `For "${item.ItemName || 'Unknown Item'}" (Code: ${item.ItemCode || 'N/A'}):\n`;
    responseText += `Current stock: ${item.current_stock} units.\n`;
    if (item.RackNo) {
      responseText += `Rack No: ${item.RackNo}.\n`;
    }

    if (purchaseHistory.length > 0) {
      responseText += `Here is the recent purchase history:`;
      return { 
        id: Date.now() + 1, 
        sender: "bot", 
        text: responseText, 
        history: purchaseHistory,
        stock: item.current_stock,
        itemName: item.ItemName || 'Unknown Item',
        itemCode: item.ItemCode || 'N/A',
        rackNo: item.RackNo || undefined, // Added rackNo
      };
    } else {
      responseText += `No purchase history found yet.`;
      return { 
        id: Date.now() + 1, 
        sender: "bot", 
        text: responseText,
        stock: item.current_stock,
        itemName: item.ItemName || 'Unknown Item',
        itemCode: item.ItemCode || 'N/A',
        rackNo: item.RackNo || undefined, // Added rackNo
      };
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { id: Date.now(), sender: "user", text: input };
    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input;
    setInput("");
    resetTranscript();
    setIsLoading(true);

    let botResponse: Message;
    const lowerInput = currentInput.toLowerCase();

    // --- Handle numbered selection first if contextual items exist ---
    if (contextualItems && !isNaN(Number(lowerInput))) {
      const selectedNumber = Number(lowerInput);
      if (selectedNumber > 0 && selectedNumber <= contextualItems.length) {
        const selectedItem = contextualItems[selectedNumber - 1];
        // Determine if the previous context was a stock check or history request
        const lastBotMessage = messages[messages.length - 1];
        if (lastBotMessage?.text?.includes("stock of") || lastBotMessage?.text?.includes("stock:")) {
          botResponse = { id: Date.now() + 1, sender: 'bot', text: `You have ${selectedItem.current_stock} of "${selectedItem.ItemName || 'Unknown Item'}" (Code: ${selectedItem.ItemCode || 'N/A'}${selectedItem.RackNo ? `, Rack: ${selectedItem.RackNo}` : ''}) in stock.`, stock: selectedItem.current_stock, itemName: selectedItem.ItemName || 'Unknown Item', itemCode: selectedItem.ItemCode || 'N/A', rackNo: selectedItem.RackNo || undefined };
        } else {
          // Default to full history and stock if not explicitly a stock query
          botResponse = await getHistoryAndStockForItem(selectedItem);
        }
        setContextualItems(null); // Clear contextual items after selection
      } else {
        botResponse = { id: Date.now() + 1, sender: "bot", text: "That's not a valid number. Please choose a number from the list or ask a new question." };
      }
    } else {
      // --- Intent Recognition ---
      const newCategoryMatch = lowerInput.match(/^(new|add|create) category (.+)/);
      const newItemMatch = lowerInput.match(/^(new|add|create) item (.+?) (?:in|category) (.+)/);
      const newPurchaseMatch = lowerInput.match(/^(new|add|create) purchase (?:from|at) (.+)/);
      const newSaleMatch = lowerInput.match(/^(new|add|create) sale (?:to|for) (.+)/);
      const navigationMatch = lowerInput.match(/^(?:go to|open|show me the) (dashboard|overview|inventory|purchases|sales|items|categories|settings|customers|suppliers|barcode-print)(?: page)?$/);

      // Enhanced Stock Check Intent
      const stockKeywords = ["stock", "quantity", "how many", "available", "left"];
      const isStockQuery = stockKeywords.some(keyword => lowerInput.includes(keyword));
      let stockItemName = "";
      if (isStockQuery) {
        const stockQueryRegex = /(?:stock of|how many|how much|check stock for|stock for|stock level of|stock levels of|current stock of|current stock for|available quantity of|remaining quantity of|stock|quantity|available|left)\s+(.+?)(?: do I have| is in stock| in stock| available| left)?$/;
        const match = lowerInput.match(stockQueryRegex);
        if (match && match[1]) {
          stockItemName = match[1].replace(/(?:do i have|is in stock|in stock|available|left)$/, '').trim();
        } else {
          const parts = lowerInput.split(/\s+/);
          if (parts.length > 1 && (parts[parts.length - 1] === "stock" || parts[parts.length - 1] === "left")) {
            stockItemName = parts.slice(0, -1).join(' ').trim();
          } else {
            stockItemName = lowerInput.replace(/(?:what's the|show me the|the|of|for)/g, '').trim();
          }
        }
      }

      // Explicit History Query Intent
      const historyKeywords = ["history of", "supplier of", "past purchases of", "purchase history of"];
      const isHistoryQuery = historyKeywords.some(keyword => lowerInput.includes(keyword));
      let historyItemName = "";
      if (isHistoryQuery) {
        const historyQueryRegex = /(?:history of|supplier of|past purchases of|purchase history of)\s+(.+)$/;
        const match = lowerInput.match(historyQueryRegex);
        if (match && match[1]) {
          historyItemName = match[1].trim();
        } else {
          historyItemName = lowerInput.replace(/(?:show me the|the|of|for)/g, '').trim();
        }
      }

      if (navigationMatch) {
          const page = navigationMatch[1];
          const pageMap: { [key: string]: string } = {
              dashboard: '/',
              overview: '/',
              inventory: '/inventory',
              purchases: '/purchases',
              sales: '/sales',
              items: '/items',
              categories: '/categories',
              settings: '/settings',
              customers: '/customers',
              suppliers: '/suppliers',
              'barcode-print': '/barcode-print',
          };
          const path = pageMap[page];
          botResponse = { id: Date.now() + 1, sender: 'bot', text: `Navigating to the ${page} page.` };
          navigate(path);
          onOpenChange(false);
      } else if (newCategoryMatch) {
        const categoryName = newCategoryMatch[2].trim();
        botResponse = { id: Date.now() + 1, sender: 'bot', text: `OK. I'm opening the new category form for "${categoryName}".` };
        navigate('/categories', { state: { action: 'add-category', name: categoryName } });
        onOpenChange(false);
      } else if (newItemMatch) {
        const itemName = newItemMatch[2].trim();
        const categoryName = newItemMatch[3].trim();
        const { data: categoryData } = await supabase.from("CategoryMaster").select("CategoryId").ilike("CategoryName", categoryName).single();
        if (categoryData) {
          botResponse = { id: Date.now() + 1, sender: 'bot', text: `OK. I'm opening the new item form for "${itemName}" in the "${categoryName}" category.` };
          navigate('/items', { state: { action: 'add-item', name: itemName, categoryId: categoryData.CategoryId } });
          onOpenChange(false);
        } else {
          botResponse = { id: Date.now() + 1, sender: 'bot', text: `I couldn't find a category named "${categoryName}". Opening new item form, you can add the category there.` };
          navigate('/items', { state: { action: 'add-item', name: itemName, initialCategoryName: categoryName } }); // Pass initial category name
          onOpenChange(false);
        }
      } else if (newPurchaseMatch) {
        const supplierName = newPurchaseMatch[2].trim();
        const { data: supplierData } = await supabase.from("SupplierMaster").select("SupplierId").ilike("SupplierName", supplierName).single();
        if (supplierData) {
          botResponse = { id: Date.now() + 1, sender: 'bot', text: `OK. I'm starting a new purchase from "${supplierName}".` };
          navigate('/purchases/new', { state: { action: 'add-purchase', supplierId: supplierData.SupplierId } });
          onOpenChange(false);
        } else {
          botResponse = { id: Date.now() + 1, sender: 'bot', text: `I couldn't find a supplier named "${supplierName}". Opening new purchase form, you can add the supplier there.` };
          navigate('/purchases/new', { state: { action: 'add-purchase', initialSupplierName: supplierName } });
          onOpenChange(false);
        }
      } else if (newSaleMatch) {
        const customerName = newSaleMatch[2].trim();
        const { data: customerData } = await supabase.from("CustomerMaster").select("CustomerId").ilike("CustomerName", customerName).single();
        if (customerData) {
          botResponse = { id: Date.now() + 1, sender: 'bot', text: `OK. I'm starting a new sale to "${customerName}".` };
          navigate('/sales/new', { state: { action: 'add-sale', customerId: customerData.CustomerId } });
          onOpenChange(false);
        } else {
          botResponse = { id: Date.now() + 1, sender: 'bot', text: `I couldn't find a customer named "${customerName}". Opening new sale form, you can add the customer there.` };
          navigate('/sales/new', { state: { action: 'add-sale', initialCustomerName: customerName } });
          onOpenChange(false);
        }
      } else if (isStockQuery && stockItemName) {
          const { data, error } = await supabase
              .from('item_stock_details')
              .select('ItemId, ItemName, current_stock, ItemCode, RackNo') // Added RackNo
              // .ilike('ItemName', `%${stockItemName}%`); // Removed user_id filter
              .ilike('ItemName', `%${stockItemName}%`);
          
          if (error || !data || data.length === 0) {
              const { data: broaderData } = await supabase
                .from('item_stock_details')
                .select('ItemId, ItemName, current_stock, ItemCode, RackNo') // Added RackNo
                // .textSearch('ItemName', `'${stockItemName}'`); // Removed user_id filter
                .textSearch('ItemName', `'${stockItemName}'`);
              
              if (broaderData && broaderData.length > 0) {
                const itemsList = broaderData.slice(0, 5).map((item, index) => `${index + 1}. ${item.ItemName || 'Unknown Item'} (Code: ${item.ItemCode || 'N/A'}, ${item.current_stock} in stock${item.RackNo ? `, Rack: ${item.RackNo}` : ''})`).join('\n');
                botResponse = { id: Date.now() + 1, sender: 'bot', text: `I couldn't find an exact match for "${stockItemName}", but found these similar items:\n${itemsList}\n\nCould you be more specific? Please reply with the number.` };
                setContextualItems(broaderData.slice(0, 5) as ContextItem[]);
              } else {
                botResponse = { id: Date.now() + 1, sender: 'bot', text: `Sorry, I couldn't find any item matching "${stockItemName}" to check its stock. Please try different keywords.` };
              }
          } else if (data.length === 1) {
              const item = data[0];
              botResponse = { id: Date.now() + 1, sender: 'bot', text: `You have ${item.current_stock} of "${item.ItemName || 'Unknown Item'}" (Code: ${item.ItemCode || 'N/A'}${item.RackNo ? `, Rack: ${item.RackNo}` : ''}) in stock.`, stock: item.current_stock, itemName: item.ItemName || 'Unknown Item', itemCode: item.ItemCode || 'N/A', rackNo: item.RackNo || undefined };
          } else {
              const itemsList = data.slice(0, 5).map((item, index) => `${index + 1}. ${item.ItemName || 'Unknown Item'} (Code: ${item.ItemCode || 'N/A'}, ${item.current_stock} in stock${item.RackNo ? `, Rack: ${item.RackNo}` : ''})`).join('\n');
              botResponse = { id: Date.now() + 1, sender: 'bot', text: `I found a few items matching "${stockItemName}":\n${itemsList}\n\nCould you be more specific? Please reply with the number.` };
              setContextualItems(data.slice(0, 5) as ContextItem[]);
          }
      } else if (isHistoryQuery && historyItemName) {
        const { data: items, error: itemsError } = await supabase
          .from("item_stock_details") // Use item_stock_details to get stock too
          .select("ItemId, ItemName, current_stock, ItemCode, RackNo") // Added RackNo
          // .ilike("ItemName", `%${historyItemName}%`) // Removed user_id filter
          .ilike("ItemName", `%${historyItemName}%`)
          .limit(5);

        if (itemsError || !items || items.length === 0) {
          botResponse = { id: Date.now() + 1, sender: "bot", text: `Sorry, I couldn't find an item matching "${historyItemName}" to show its history. Please try another name.` };
          setContextualItems(null);
        } else if (items.length === 1) {
          botResponse = await getHistoryAndStockForItem(items[0] as ContextItem);
          setContextualItems(null);
        } else {
          const itemsList = items.map((i, index) => `${index + 1}. ${i.ItemName || 'Unknown Item'} (Code: ${i.ItemCode || 'N/A'}${i.RackNo ? `, Rack: ${i.RackNo}` : ''})`).join('\n');
          const text = `I found several items matching "${historyItemName}". Which one did you mean? Please reply with the number to see its history and stock.` + (items.length > 0 ? `\n${itemsList}` : '');
          botResponse = { id: Date.now() + 1, sender: "bot", text };
          setContextualItems(items as ContextItem[]);
        }
      } else {
        // --- Fallback to implicit item query (item name only) ---
        const searchTerm = lowerInput.trim(); // Use the raw input as search term
        const { data: items, error: itemsError } = await supabase
          .from("item_stock_details") // Use item_stock_details to get stock too
          .select("ItemId, ItemName, current_stock, ItemCode, RackNo") // Added RackNo
          // .ilike("ItemName", `%${searchTerm}%`) // Removed user_id filter
          .ilike("ItemName", `%${searchTerm}%`)
          .limit(5);

        if (itemsError || !items || items.length === 0) {
          botResponse = { id: Date.now() + 1, sender: "bot", text: `Sorry, I couldn't find an item matching "${searchTerm}". Please try another name or a more specific query like "stock of X" or "new category Y".` };
          setContextualItems(null);
        } else if (items.length === 1) {
          botResponse = await getHistoryAndStockForItem(items[0] as ContextItem);
          setContextualItems(null);
        } else {
          const itemsList = items.map((i, index) => `${index + 1}. ${i.ItemName || 'Unknown Item'} (Code: ${i.ItemCode || 'N/A'}, ${i.current_stock} in stock${i.RackNo ? `, Rack: ${i.RackNo}` : ''})`).join('\n');
          const text = `I found several items matching "${searchTerm}". Which one did you mean? Please reply with the number to see its history and stock.` + (items.length > 0 ? `\n${itemsList}` : '');
          botResponse = { id: Date.now() + 1, sender: "bot", text };
          setContextualItems(items as ContextItem[]);
        }
      }
    }
    
    setMessages((prev) => [...prev, botResponse]);
    setIsLoading(false);
  };

  const handleVoiceInput = () => {
    if (listening) SpeechRecognition.stopListening();
    else { resetTranscript(); SpeechRecognition.startListening(); }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col h-full w-full sm:max_w-lg">
        <SheetHeader>
          <SheetTitle>Purchase Assistant</SheetTitle>
          <SheetDescription>Ask about your items to see their history.</SheetDescription>
        </SheetHeader>
        <ScrollArea className="flex-1 my-4 -mx-6 px-6">
          <div className="space-y-6">
            {messages.map((message) => (
              <div key={message.id} className={cn("flex items-start gap-3", message.sender === "user" && "justify-end")}>
                {message.sender === "bot" && <Avatar className="h-8 w-8"><AvatarFallback><Bot className="h-5 w-5" /></AvatarFallback></Avatar>}
                <div className={cn("max-w-xs sm:max-w-sm rounded-lg p-3 text-sm whitespace-pre-wrap", message.sender === "bot" ? "bg-muted" : "bg-primary text-primary-foreground")}>
                  {message.text && <p>{message.text}</p>}
                  {message.stock !== undefined && message.itemName && message.itemCode && !message.history && (
                    <div className="mt-2 bg-background/50 rounded-md p-2 -m-1">
                      <p className="font-semibold">{message.itemName} (Code: {message.itemCode})</p>
                      <p>Current Stock: <span className="font-bold">{message.stock} units</span></p>
                      {message.rackNo && <p>Rack No: <span className="font-bold">{message.rackNo}</span></p>}
                    </div>
                  )}
                  {message.history && (
                    <div className="mt-2 bg-background/50 rounded-md p-2 -m-1">
                      {message.itemName && message.itemCode && message.stock !== undefined && (
                        <>
                          <p className="font-semibold">{message.itemName} (Code: {message.itemCode})</p>
                          <p>Current Stock: <span className="font-bold">{message.stock} units</span></p>
                          {message.rackNo && <p>Rack No: <span className="font-bold">{message.rackNo}</span></p>}
                          <p className="mb-2"></p>
                        </>
                      )}
                      <h4 className="font-semibold mb-1">Purchase History:</h4>
                      <Table>
                        <TableHeader><TableRow><TableHead>Shop</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Price</TableHead></TableRow></TableHeader>
                        <TableBody>
                          {message.history.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell>{item.shopName}</TableCell>
                              <TableCell>{formatDate(item.purchaseDate)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
                {message.sender === "user" && <Avatar className="h-8 w-8"><AvatarFallback><UserIcon className="h-5 w-5" /></AvatarFallback></Avatar>}
              </div>
            ))}
            {isLoading && (
              <div className="flex items-start gap-3">
                <Avatar className="h-8 w-8"><AvatarFallback><Bot className="h-5 w-5" /></AvatarFallback></Avatar>
                <div className="bg-muted rounded-lg p-3 text-sm flex items-center space-x-2"><Loader2 className="h-4 w-4 animate-spin" /><span>Thinking...</span></div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
        <form onSubmit={handleSendMessage} className="flex items-center gap-2 border-t pt-4 -mx-6 px-6">
          <Input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about an item..." className="flex-1" disabled={isLoading} />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button type="button" size="icon" variant={listening ? "destructive" : "outline"} onClick={handleVoiceInput} disabled={!browserSupportsSpeechRecognition}>
                  {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>{!browserSupportsSpeechRecognition ? "Voice input not supported" : (listening ? "Stop listening" : "Start voice input")}</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()}><span><Send className="h-4 w-4" /></span></Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}