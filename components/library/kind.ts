import { FileText, ListVideo, MessageCircle, PlayCircle } from 'lucide-react';

/** An item's kind as shown on cards (colors match the home page sections). */
export function kindOf(types: string[]) {
  if (types.includes('qa') && types.includes('video')) return { label: 'שו"ת בווידאו', Icon: MessageCircle, cls: 'bg-green-50 text-green-700', strip: 'bg-green-100' };
  if (types.includes('qa')) return { label: 'שו"ת', Icon: MessageCircle, cls: 'bg-green-50 text-green-700', strip: 'bg-green-100' };
  if (types.includes('series')) return { label: 'שיעור בסדרה', Icon: ListVideo, cls: 'bg-blue-50 text-blue-700', strip: 'bg-blue-100' };
  if (types.includes('video')) return { label: 'וידאו', Icon: PlayCircle, cls: 'bg-red-50 text-red-700', strip: 'bg-red-100' };
  return { label: 'מאמר', Icon: FileText, cls: 'bg-purple-50 text-purple-700', strip: 'bg-purple-100' };
}
