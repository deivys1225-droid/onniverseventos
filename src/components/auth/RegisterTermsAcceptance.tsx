import { ONNIVER_REGISTRATION_LEGAL, REGISTER_TERMS_CHECKBOX_LABEL } from "@/data/onniverRegistrationLegal";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";

type RegisterTermsAcceptanceProps = {
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
  disabled?: boolean;
};

const RegisterTermsAcceptance = ({ checked, onCheckedChange, disabled }: RegisterTermsAcceptanceProps) => {
  const legal = ONNIVER_REGISTRATION_LEGAL;

  return (
    <div className="space-y-3 rounded-xl border border-border/50 bg-black/20 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        Lee antes de registrarte
      </p>
      <ScrollArea className="h-44 w-full rounded-lg border border-border/40 bg-background/40 pr-3">
        <div className="space-y-3 p-3 text-left text-xs leading-relaxed text-muted-foreground">
          <h2 className="font-display text-sm font-bold text-foreground">{legal.title}</h2>
          <p className="text-[11px] text-primary/90">Última actualización: {legal.updatedAt}</p>
          <p>{legal.intro}</p>
          {legal.sections.map((section) => (
            <div key={section.heading}>
              <h3 className="mb-1 font-semibold text-foreground/90">{section.heading}</h3>
              <p>{section.body}</p>
            </div>
          ))}
        </div>
      </ScrollArea>
      <div className="flex items-start gap-3">
        <Checkbox
          id="reg-terms"
          checked={checked}
          onCheckedChange={(value) => onCheckedChange(value === true)}
          disabled={disabled}
          className="mt-0.5"
        />
        <Label htmlFor="reg-terms" className="cursor-pointer text-sm leading-snug text-foreground">
          {REGISTER_TERMS_CHECKBOX_LABEL}
        </Label>
      </div>
    </div>
  );
};

export default RegisterTermsAcceptance;
