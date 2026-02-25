import { Outlet } from 'react-router-dom';

const MainLayout = () => {
  return (
    <div className="text-white overflow-hidden">
      <div className="fixed top-0 left-0 z-10 h-dvh w-dvw overflow-auto lg:px-10 px-5 lg:py-20 py-5">
        <div className="md:w-full flex-0 h-full  flex flex-col" >
          <div className="z-20 max-w-[600px]">
            <img
              className=" mx-auto"
              src="/images/ultrakidle-logo.png"
            />
          </div>
          <div className="flex flex-col h-full w-full">
            <div className="flex-1 pb-10">
            <Outlet />
            </div>
            <div className="z-30  text-left lg:text-xl text-lg">
              <span className="opacity-50">
                INTO SOCIALS... OK
              </span>
              <div className="flex gap-3 lg:text-3xl text-xl">
                <a
                  target="_blank"
                  href="https://github.com/ikz87"
                  className="underline cursor-pointer"
                >GITHUB</a>
                <a
                  target="_blank"
                  href="https://www.youtube.com/@kz8785/"
                  className="underline cursor-pointer"
                >YOUTUBE</a>
                <a
                  target="_blank"
                  href="https://x.com/iikz87ii"
                  className="underline cursor-pointer"
                >TWITTER</a>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className=" h-dvh w-dvw bg-black fixed top-0 left-0  overflow-hidden ">
        <img className="opacity-30 object-cover w-full h-full mx-auto scale-[1.02]" src="/images/main-menu.gif" />
      </div>
    </div>
  );
};

export default MainLayout;
