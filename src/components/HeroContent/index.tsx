interface HeroContentProps {
    height?: string;
    backgroundColor?:string;
    children?: React.ReactNode;
}

const HeroContent: React.FC<HeroContentProps> = ({height = "60vh", backgroundColor="#E4EEF3",children} : HeroContentProps) => {
    return (
       <section style={{height,backgroundColor}} className={`w-full`}>
            {children}
       </section>
    )
}

export default HeroContent