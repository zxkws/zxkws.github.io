type LightSpaceMarkProps = {
  className?: string;
};

const LightSpaceMark = ({ className }: LightSpaceMarkProps) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="11" cy="12" r="6.5" />
    <circle cx="11" cy="12" r="2.25" />
    <path d="M2.5 12H4M18 12h3.5M11 3.5V2M11 22v-1.5" />
  </svg>
);

export default LightSpaceMark;
