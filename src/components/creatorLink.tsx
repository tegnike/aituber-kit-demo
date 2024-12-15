export const CreatorLink = () => {
  return (
    <div className="absolute right-0 z-15 m-24">
      <a
        draggable={false}
        href="https://nikechan.com"
        rel="noopener noreferrer"
        target="_blank"
      >
        <div className="p-8 rounded-16 bg-[#1F2328] hover:bg-[#33383E] active:bg-[565A60] flex">
          <div className="mx-4 text-white font-bold">Creator Page</div>
        </div>
      </a>
    </div>
  )
}
