"use client";

import { useActionState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { suggestAvailability, type SuggestAvailabilityInput, type SuggestAvailabilityOutput } from '@/ai/flows/suggest-availability';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Bot, Loader2, Lightbulb } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const initialState: {
  output: SuggestAvailabilityOutput | null;
  error: string | null;
} = {
  output: null,
  error: null,
};

async function suggestAvailabilityAction(prevState: any, formData: FormData) {
  const resourceType = formData.get('resourceType') as 'classroom' | 'invigilator';
  const dateTime = formData.get('dateTime') as string;
  const durationMinutes = Number(formData.get('durationMinutes'));

  if (!resourceType || !dateTime || !durationMinutes) {
    return { output: null, error: "Please fill all fields." };
  }

  const input: SuggestAvailabilityInput = {
    resourceType,
    dateTime: new Date(dateTime).toISOString(),
    durationMinutes,
  };

  try {
    const output = await suggestAvailability(input);
    return { output, error: null };
  } catch (e: any) {
    return { output: null, error: e.message || "An unknown error occurred." };
  }
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}
      Get Suggestions
    </Button>
  );
}

export function AiSuggestionCard() {
  const [state, formAction] = useActionState(suggestAvailabilityAction, initialState);
  const { toast } = useToast();

  useEffect(() => {
    if (state.error) {
      toast({
        variant: 'destructive',
        title: 'AI Suggestion Error',
        description: state.error,
      });
    }
  }, [state.error, toast]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="text-primary" />
          AI Availability Suggestions
        </CardTitle>
        <CardDescription>Let AI suggest the best resources based on historical patterns.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="resourceType">Resource</Label>
              <Select name="resourceType" defaultValue="classroom">
                <SelectTrigger id="resourceType">
                  <SelectValue placeholder="Select resource" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="classroom">Classroom</SelectItem>
                  <SelectItem value="invigilator">Invigilator</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="durationMinutes">Duration (mins)</Label>
              <Input id="durationMinutes" name="durationMinutes" type="number" defaultValue="180" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="dateTime">Date & Time</Label>
            <Input id="dateTime" name="dateTime" type="datetime-local" defaultValue={new Date(Date.now() + 24*60*60*1000).toISOString().substring(0,16)} />
          </div>
          <SubmitButton />
        </form>

        {state.output && (
          <Alert className="mt-4 bg-accent/20 border-accent/50">
            <Lightbulb className="h-4 w-4 text-accent-foreground" />
            <AlertTitle className="text-accent-foreground">AI Suggestions</AlertTitle>
            <AlertDescription className="text-foreground/80">
              <p className="font-semibold mt-2 mb-1">Recommended:</p>
              <div className="flex flex-wrap gap-2 mb-2">
                {state.output.suggestions.map(s => (
                  <Badge key={s} variant="default" className="bg-accent text-accent-foreground">{s}</Badge>
                ))}
              </div>
              <p className="italic">"{state.output.reasoning}"</p>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
