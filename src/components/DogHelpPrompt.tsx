import { useState } from "react";
import Modal from "./ui/Modal";
import { ExternalLink } from "./ui/ExternalLink";

const DogHelpPrompt = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex items-center gap-2 mb-4 px-2 py-1 bg-blue-500/10 border-2 border-blue-500/20 w-fit">
      <span className="text-sm text-blue-400 font-medium">
        My dog is sick, want to help me out?{" "}
        <button
        type="button"
          onClick={() => setIsOpen(true)}
          className="underline hover:text-blue-300 transition-colors cursor-pointer font-bold"
        >
          Learn more
        </button>
      </span>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="HELP REQUEST FOR CELESTE"
        maxWidth="max-w-xl"
        footerButtonText="DISMISS"
      >
        <div className="space-y-4 tracking-tight">
          <p>
            Hi everyone, creator of ULTRAKIDLE here, I want you all to meet <span className="text-white font-bold">Celeste</span>, my
            German Shepherd companion since ~July 2018.
          </p>
          <div className="grid grid-cols-3 gap-2">
            <img src="/images/celeste-1.jpeg"/>
            <img src="/images/celeste-2.gif" />
            <img src="/images/celeste-3.jpeg" />
          </div>
          <p>
            About a week and a half ago, Celeste lost her appetite and stopped
            eating her usual food. We recently discovered a very bad flea
            infestation that escalated rapidly despite treatment, leading to
            significant weight loss and visible signs of anemia.
          </p>
            <div className="grid grid-cols-2 gap-2">
          <img
            src="/images/celeste-fleas.jpeg"
            className=""
            alt="Medical context"
          />
          <img
            src="/images/celeste-sick.jpeg"
            className=""
            alt="Medical context"
          />
                    </div>
          <p>
            The vet has recommended comprehensive blood work to check her red cell and platelet counts. This is necessary to determine the severity of her anemia and to rule out other underlying blood-borne parasites or secondary infections that may have been introduced, ensuring we treat the root cause and not just the symptoms.
          </p>
          <p>
            Both the tests and the follow up treatment are a bit costly. Taking into account the fact that I'm currently unemployed (open for hire as web dev btw!) and that I live in a 3rd world country, makes it feel like a punch to the gut to receive these news. I'd really appreciate any help I can get.
          </p>
          <div className="bg-blue-500/10 border-2 border-blue-500/30 p-4 ">
            <p className="text-blue-400 font-bold mb-2">HOW YOU CAN HELP:</p>
            <ul className="list-disc pl-4 space-y-2 text-white/70">
              <li>
                <ExternalLink
                  href="https://ko-fi.com/ikz87"
                  className="text-white underline hover:text-blue-300 transition-colors"
                >
                  Support on ko-fi
                </ExternalLink>
                &nbsp;(You will be shown in the donors board as usual)
              </li>
              <li>
                Share the link with others who might want to help
              </li>
            </ul>
          </div>
          <p className="opacity-50 text-sm ">
            Thank you for your kindness. This message will be live until Celeste
            is healthy again. I will give an update through the V-Mail Terminal
            when that happens.
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default DogHelpPrompt;
