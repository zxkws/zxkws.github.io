const CurlConverterMicroApp = () => {
  return (
    <section className="flex h-full w-full flex-1 flex-col -mx-8">
      <div className="flex flex-1 overflow-hidden rounded-3xl border border-[color:var(--header-border)] bg-[color:var(--card-bg)] shadow-[0_24px_45px_-35px_rgba(37,99,235,0.35)] backdrop-blur">
        <iframe
          title="curlconverter"
          src="https://curlconverter.com/"
          className="h-full w-full border-0"
          loading="lazy"
          allow="clipboard-write; clipboard-read"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    </section>
  );
};

export default CurlConverterMicroApp;
