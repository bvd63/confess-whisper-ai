interface AppLogoProps {
  className?: string;
}

export const AppLogo = ({ className = "" }: AppLogoProps) => {
  return (
    <span className={className}>
      Confess<span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">AI</span>
    </span>
  );
};
