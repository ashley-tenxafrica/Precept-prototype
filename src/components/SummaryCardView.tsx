import React from 'react';
import { AssessmentItem, ExtractedData } from '../types';
import { Badge } from './ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';

export function SummaryCardView({
  item,
  extractedData,
  onApprove,
  onReject
}: {
  item: AssessmentItem;
  extractedData: ExtractedData;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const ratingColors: Record<string, string> = {
    'High': 'bg-green-500',
    'Reasonable': 'bg-yellow-500',
    'Limited': 'bg-orange-500',
    'Very Limited': 'bg-red-500'
  };

  return (
    <Card className="max-w-2xl mx-auto border-red-500/20 shadow-lg">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-2xl font-bold">{item.title}</CardTitle>
            <CardDescription>Approval required for data processing activities.</CardDescription>
          </div>
          <Badge className={ratingColors[item.assuranceRating || ''] || 'bg-gray-500'}>
            Assurance Rating: {item.assuranceRating}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800 font-bold flex items-center">
            <span className="mr-2">⚠️</span> 
            Human-in-the-Loop Approval Required
          </p>
          <p className="text-red-700 text-sm mt-1">Please review the AI's reasoning carefully before approving or rejecting this assessment.</p>
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold text-lg">AI Reasoning</h3>
          
          <div className="bg-slate-50 p-4 rounded-md text-sm text-slate-800">
            {extractedData.reasoning}
          </div>

          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="p-3 bg-white border rounded shadow-sm text-center">
              <div className="text-xs text-gray-500 uppercase">Legal Basis Met</div>
              <div className="font-bold text-lg">{extractedData.basis_met ? 'Yes' : 'No'}</div>
            </div>
            <div className="p-3 bg-white border rounded shadow-sm text-center">
              <div className="text-xs text-gray-500 uppercase">S.9 Lawfulness Met</div>
              <div className="font-bold text-lg">{extractedData.s9_met ? 'Yes' : 'No'}</div>
            </div>
            <div className="p-3 bg-white border rounded shadow-sm text-center">
              <div className="text-xs text-gray-500 uppercase">S.10 Minimality Met</div>
              <div className="font-bold text-lg">{extractedData.s10_met ? 'Yes' : 'No'}</div>
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex justify-end gap-4 border-t pt-6 bg-slate-50/50">
        <Button variant="outline" onClick={() => onReject(item.id)}>
          Reject Assessment
        </Button>
        <Button onClick={() => onApprove(item.id)} className="bg-black hover:bg-gray-800 text-white">
          Approve Assessment
        </Button>
      </CardFooter>
    </Card>
  );
}
